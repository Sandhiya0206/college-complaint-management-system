/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Innovation #E: Online Logistic Regression — SLA Breach Predictor
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Predicts whether a newly assigned complaint will breach its SLA *before*
 * the deadline, enabling proactive escalation.
 *
 * Model: Logistic Regression trained with SGD (online learning)
 *   P(breach) = σ(wᵀx + b) = 1 / (1 + e^(−(wᵀx+b)))
 *
 * Feature vector x (6 features):
 *   [0] categoryRisk    — empirical breach rate per category (0–1)
 *   [1] priorityScore   — High=0.9, Medium=0.5, Low=0.1
 *   [2] workerLoad      — current active complaints / 10 (normalised)
 *   [3] workerBreachRate — historical breach rate for assigned worker (0–1)
 *   [4] hourSin         — sin(2π × hour / 24)  — circular encoding
 *   [5] hourCos         — cos(2π × hour / 24)
 *
 * Training: Each resolved complaint provides a label (1 = breached SLA).
 *   SGD update:  w ← w − η (p̂ − y) x
 *                b ← b − η (p̂ − y)
 *   Regularisation: L2 (weight decay)
 *
 * Model weights are persisted in MongoDB (SLAModel) and updated after each
 * complaint is resolved, enabling continuous/online learning.
 * ─────────────────────────────────────────────────────────────────────────────
 */
'use strict';

const SLAModel   = require('../models/SLAModel');
const Complaint  = require('../models/Complaint');

// ─── Constants ────────────────────────────────────────────────────────────────
const LEARNING_RATE   = 0.05;
const L2_LAMBDA       = 0.001;   // regularisation strength
const DEFAULT_SLA_HRS = 24;

// Baseline category risk (updated empirically via learnFromHistory())
const DEFAULT_CATEGORY_RISK = {
  Electrical: 0.35, Plumbing: 0.40, Furniture: 0.20, Cleanliness: 0.15,
  'AC/Ventilation': 0.45, 'Internet/WiFi': 0.30, Infrastructure: 0.55,
  Security: 0.25, Other: 0.35,
};

const PRIORITY_SCORE = { High: 0.9, Medium: 0.5, Low: 0.1 };

// ─── Sigmoid ─────────────────────────────────────────────────────────────────
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

// ─── Feature Vector Builder ───────────────────────────────────────────────────

/**
 * buildFeatures
 * ─────────────
 * @param {Object} opts
 * @param {string} opts.category
 * @param {string} opts.priority
 * @param {number} opts.workerLoad      — active complaints for assigned worker
 * @param {number} opts.workerBreachRate — 0–1
 * @param {number} opts.hour            — hour of day (0–23)
 * @param {Object} opts.categoryRiskMap — per-category empirical breach rates
 */
const buildFeatures = ({ category, priority, workerLoad, workerBreachRate, hour, categoryRiskMap = {} }) => {
  const catRisk = categoryRiskMap[category] ?? DEFAULT_CATEGORY_RISK[category] ?? 0.35;
  const priScore = PRIORITY_SCORE[priority] || 0.5;
  const loadNorm = Math.min(workerLoad, 10) / 10;
  const angle = (2 * Math.PI * hour) / 24;
  return [catRisk, priScore, loadNorm, workerBreachRate, Math.sin(angle), Math.cos(angle)];
};

// ─── Load / Init Model ────────────────────────────────────────────────────────
const getModel = async () => {
  let model = await SLAModel.findOne({ name: 'sla_breach_v1' });
  if (!model) {
    model = await SLAModel.create({ name: 'sla_breach_v1' });
    // Trigger initial training from history
    setImmediate(() => learnFromHistory().catch(() => {}));
  }
  return model;
};

// ─── Predict ─────────────────────────────────────────────────────────────────

/**
 * predictSLABreach
 * ────────────────
 * Returns the probability that this complaint will miss its SLA.
 *
 * @param {{ category, priority, workerId, slaHours? }}
 * @returns {{ probability: number, willBreach: boolean, confidence: string, features: number[] }}
 */
const predictSLABreach = async ({ category, priority, workerId, slaHours = DEFAULT_SLA_HRS }) => {
  try {
    const model = await getModel();

    // Worker load
    let workerLoad = 0, workerBreachRate = 0;
    if (workerId) {
      const [loadAgg, breachAgg] = await Promise.all([
        Complaint.countDocuments({ assignedTo: workerId, status: { $nin: ['Resolved','Rejected','Completed'] } }),
        Complaint.aggregate([
          {
            $match: {
              assignedTo: workerId,
              completedAt: { $exists: true },
              assignedAt:  { $exists: true },
              status: { $in: ['Resolved', 'Completed'] },
            }
          },
          {
            $project: {
              breached: { $gt: [{ $subtract: ['$completedAt', '$assignedAt'] }, slaHours * 3600000] }
            }
          },
          { $group: { _id: null, total: { $sum: 1 }, breached: { $sum: { $cond: ['$breached', 1, 0] } } } },
        ]),
      ]);
      workerLoad = loadAgg;
      if (breachAgg.length > 0) {
        workerBreachRate = breachAgg[0].total > 0 ? breachAgg[0].breached / breachAgg[0].total : 0;
      }
    }

    const hour = new Date().getHours();
    const x = buildFeatures({ category, priority, workerLoad, workerBreachRate, hour });

    const { weights, bias } = model;
    const z = weights.reduce((sum, w, i) => sum + w * (x[i] || 0), 0) + bias;
    const prob = sigmoid(z);

    const willBreach = prob >= 0.5;
    const confidence = prob >= 0.75 || prob <= 0.25 ? 'high' : prob >= 0.60 || prob <= 0.40 ? 'medium' : 'low';

    return {
      probability: Math.round(prob * 100) / 100,
      willBreach,
      confidence,
      riskPercent: Math.round(prob * 100),
      features: x,
      workerLoad,
      workerBreachRate: Math.round(workerBreachRate * 100),
    };
  } catch (err) {
    console.error('[SLAPredictor] predict error:', err.message);
    return { probability: 0.35, willBreach: false, confidence: 'low', riskPercent: 35, features: [] };
  }
};

// ─── Online Learning: update weights after a complaint resolves ───────────────

/**
 * onComplaintResolved
 * ───────────────────
 * SGD weight update called each time a complaint is resolved.
 * @param {{ complaint, slaHours? }}
 */
const onComplaintResolved = async ({ complaint, slaHours = DEFAULT_SLA_HRS }) => {
  try {
    if (!complaint.assignedAt || !complaint.completedAt) return;

    const actualHours = (complaint.completedAt - complaint.assignedAt) / 3600000;
    const label = actualHours > slaHours ? 1 : 0;   // 1 = breached

    const model = await getModel();

    // Build feature vector for this complaint
    let workerBreachRate = 0;
    if (complaint.assignedTo) {
      const hist = await Complaint.aggregate([
        { $match: { assignedTo: complaint.assignedTo, completedAt: { $exists: true }, assignedAt: { $exists: true }, status: { $in: ['Resolved','Completed'] } } },
        { $project: { breached: { $gt: [{ $subtract: ['$completedAt', '$assignedAt'] }, slaHours * 3600000] } } },
        { $group: { _id: null, total: { $sum: 1 }, b: { $sum: { $cond: ['$breached', 1, 0] } } } },
      ]);
      if (hist.length > 0 && hist[0].total > 0) workerBreachRate = hist[0].b / hist[0].total;
    }

    const hour = new Date(complaint.assignedAt).getHours();
    const x = buildFeatures({
      category: complaint.category,
      priority:  complaint.priority,
      workerLoad: 0,  // not meaningful at resolution time
      workerBreachRate,
      hour,
    });

    const w = [...model.weights];
    const b = model.bias;
    const z = w.reduce((s, wi, i) => s + wi * (x[i] || 0), 0) + b;
    const p = sigmoid(z);
    const error = p - label;

    // SGD update with L2 regularisation
    const newW = w.map((wi, i) => wi - LEARNING_RATE * (error * (x[i] || 0) + L2_LAMBDA * wi));
    const newB = b - LEARNING_RATE * error;

    model.weights = newW;
    model.bias = newB;
    model.trainingSamples += 1;
    model.lastTrainedAt = new Date();
    await model.save();

    // Also apply RL reward if complaint was RL-assigned
    if (complaint.rlState && complaint.rlAction) {
      const { applyReward } = require('./rlAssignment.service');
      const feedback = complaint.workerFeedbackAvg || null;
      await applyReward({
        rlState:   complaint.rlState,
        rlAction:  complaint.rlAction,
        metSLA:    label === 0,
        reopened:  complaint.status === 'Resolved' && (complaint.reOpenCount || 0) > 0,
        feedback,
      });
    }
  } catch (err) {
    console.error('[SLAPredictor] onResolved error:', err.message);
  }
};

// ─── Batch training from historical data ─────────────────────────────────────

/**
 * learnFromHistory
 * ────────────────
 * Trains the model on all resolved complaints in the last 90 days.
 * Called once at startup and optionally via an admin trigger.
 */
const learnFromHistory = async (slaHours = DEFAULT_SLA_HRS) => {
  try {
    const since = new Date(Date.now() - 90 * 86400000);
    const resolved = await Complaint.find({
      status: { $in: ['Resolved', 'Completed'] },
      completedAt: { $exists: true },
      assignedAt:  { $exists: true },
      createdAt:   { $gte: since },
    }).lean();

    if (resolved.length === 0) return { trained: 0 };

    // Pre-compute category empirical breach rates
    const catStats = {};
    resolved.forEach(c => {
      if (!catStats[c.category]) catStats[c.category] = { total: 0, breached: 0 };
      catStats[c.category].total++;
      if ((c.completedAt - c.assignedAt) / 3600000 > slaHours) catStats[c.category].breached++;
    });
    const categoryRiskMap = {};
    Object.entries(catStats).forEach(([cat, s]) => {
      categoryRiskMap[cat] = s.total > 0 ? s.breached / s.total : 0.35;
    });

    // Worker breach rates
    const workerBreachMap = {};
    const byWorker = {};
    resolved.forEach(c => {
      const wid = c.assignedTo?.toString();
      if (!wid) return;
      if (!byWorker[wid]) byWorker[wid] = { total: 0, b: 0 };
      byWorker[wid].total++;
      if ((c.completedAt - c.assignedAt) / 3600000 > slaHours) byWorker[wid].b++;
    });
    Object.entries(byWorker).forEach(([wid, s]) => {
      workerBreachMap[wid] = s.total > 0 ? s.b / s.total : 0;
    });

    // SGD training pass
    let w = [0, 0, 0, 0, 0, 0];
    let b = 0;

    for (const c of resolved) {
      const wid = c.assignedTo?.toString() || '';
      const workerBreachRate = workerBreachMap[wid] || 0;
      const hour = new Date(c.assignedAt).getHours();
      const x = buildFeatures({ category: c.category, priority: c.priority, workerLoad: 0, workerBreachRate, hour, categoryRiskMap });
      const label = (c.completedAt - c.assignedAt) / 3600000 > slaHours ? 1 : 0;

      const z = w.reduce((s, wi, i) => s + wi * x[i], 0) + b;
      const p = sigmoid(z);
      const err = p - label;
      w = w.map((wi, i) => wi - LEARNING_RATE * (err * x[i] + L2_LAMBDA * wi));
      b = b - LEARNING_RATE * err;
    }

    await SLAModel.updateOne(
      { name: 'sla_breach_v1' },
      { $set: { weights: w, bias: b, trainingSamples: resolved.length, lastTrainedAt: new Date() } },
      { upsert: true }
    );

    console.log(`[SLAPredictor] Trained on ${resolved.length} historical complaints.`);
    return { trained: resolved.length, weights: w, bias: b };
  } catch (err) {
    console.error('[SLAPredictor] learnFromHistory error:', err.message);
    return { trained: 0 };
  }
};

module.exports = { predictSLABreach, onComplaintResolved, learnFromHistory };

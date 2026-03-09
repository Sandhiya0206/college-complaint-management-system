/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Innovation #A: Q-Learning Reinforcement Learning Worker Assignment
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Replaces static heuristic scoring with an adaptive Q-Learning agent.
 * The agent learns *which worker to assign for which complaint state* by
 * observing real outcomes (SLA met / SLA breached / feedback score / reopened).
 *
 * State  s  = encode(category, priority, hourBucket, loadBucket)
 * Action a  = workerId
 * Reward r  = +20 resolved ≤ SLA, +feedbackBonus (0–10), −20 SLA breach,
 *             −30 complaint reopened
 *
 * Q-Update (Bellman equation):
 *   Q(s,a) ← Q(s,a) + α [ r + γ · max_{a'} Q(s',a') − Q(s,a) ]
 *
 * Exploration: ε-greedy (ε starts at 0.25, decays to 0.05 after 500 samples)
 *
 * The Q-table is persisted in MongoDB (QTable collection) so the agent
 * continuously improves across server restarts.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const QTable = require('../models/QTable');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { getWorkerAvgResolutionTime } = require('./resolutionPredictor.service');

// ─── Hyper-parameters ────────────────────────────────────────────────────────
const ALPHA        = 0.15;   // learning rate
const GAMMA        = 0.80;   // discount factor (future rewards matter less)
const EPSILON_HIGH = 0.25;   // initial exploration rate
const EPSILON_LOW  = 0.05;   // minimum exploration rate
const EPSILON_DECAY_THRESHOLD = 500; // samples before reaching EPSILON_LOW

const DEPARTMENT_MAP = {
  'Electrical': 'Electrical', 'Plumbing': 'Plumbing',
  'Furniture': 'Furniture',   'Cleanliness': 'Cleanliness',
  'AC/Ventilation': 'AC/Ventilation', 'Internet/WiFi': 'Internet/WiFi',
  'Infrastructure': 'Infrastructure', 'Security': 'Security', 'Other': null,
};

// ─── State Encoding ──────────────────────────────────────────────────────────

/**
 * Discretise continuous features into buckets for the Q-table state key.
 */
const encodeHour = (h) => {
  if (h >= 6  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
};

const encodeLoad = (n) => {
  if (n === 0)   return 'free';
  if (n <= 2)    return 'low';
  if (n <= 5)    return 'medium';
  return 'high';
};

const encodePriority = (p) => {
  const m = { High: 'H', Medium: 'M', Low: 'L' };
  return m[p] || 'M';
};

const buildStateKey = (category, priority, hourBucket, loadBucket) =>
  `${category}|${encodePriority(priority)}|${hourBucket}|${loadBucket}`;

// ─── Q-Table helpers ─────────────────────────────────────────────────────────

const getOrCreateEntry = async (state) => {
  let entry = await QTable.findOne({ state });
  if (!entry) {
    entry = await QTable.create({ state, actions: {}, visitCount: 0 });
  }
  return entry;
};

const getQValue = (entry, workerId) => {
  const v = entry.actions.get(String(workerId));
  return v !== undefined ? v : 0;
};

const setQValue = async (entry, workerId, value) => {
  entry.actions.set(String(workerId), Math.round(value * 1000) / 1000);
  entry.visitCount += 1;
  entry.updatedAt = new Date();
  await entry.save();
};

// ─── Epsilon calculator (decays with training samples) ───────────────────────
const computeEpsilon = (totalSamples) => {
  if (totalSamples >= EPSILON_DECAY_THRESHOLD) return EPSILON_LOW;
  return EPSILON_HIGH - (EPSILON_HIGH - EPSILON_LOW) * (totalSamples / EPSILON_DECAY_THRESHOLD);
};

// ─── Main: Choose worker via Q-Learning ──────────────────────────────────────

/**
 * findBestWorkerRL
 * ────────────────
 * Returns the best worker for a given complaint using the Q-Learning policy.
 * Falls back gracefully to the load-based heuristic if no Q-data exists yet.
 *
 * @param {string} category
 * @param {string} priority
 * @returns {{ worker, activeComplaintCount, state, action, reason }}
 */
const findBestWorkerRL = async (category, priority = 'Medium') => {
  try {
    const department = DEPARTMENT_MAP[category] || null;

    // ── 1. Fetch eligible workers ──────────────────────────────────────────
    let workers = await User.find({
      role: 'worker', isActive: true,
      ...(department && { department }),
    }).lean();

    if (workers.length === 0 && department) {
      workers = await User.find({ role: 'worker', isActive: true }).lean();
    }
    if (workers.length === 0) return null;

    // ── 2. Build load map ──────────────────────────────────────────────────
    const workerIds = workers.map(w => w._id);
    const loadAgg = await Complaint.aggregate([
      { $match: { assignedTo: { $in: workerIds }, status: { $nin: ['Resolved', 'Rejected', 'Completed'] } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
    ]);
    const loadMap = {};
    loadAgg.forEach(({ _id, count }) => { loadMap[_id.toString()] = count; });

    // ── 3. Encode state using the worker with *lowest* load (representative) ──
    const minLoad = Math.min(...workers.map(w => loadMap[w._id.toString()] || 0));
    const hour = new Date().getHours();
    const hourBucket = encodeHour(hour);
    const loadBucket = encodeLoad(minLoad);
    const state = buildStateKey(category, priority, hourBucket, loadBucket);

    // ── 4. Load Q-entry for this state ─────────────────────────────────────
    const qEntry = await getOrCreateEntry(state);
    const totalSamples = qEntry.visitCount;
    const epsilon = computeEpsilon(totalSamples);

    // ── 5. ε-greedy action selection ───────────────────────────────────────
    let chosenWorker = null;
    let selectionMethod = '';

    const explore = Math.random() < epsilon;
    if (explore) {
      // Random exploration — pick any eligible worker
      chosenWorker = workers[Math.floor(Math.random() * workers.length)];
      selectionMethod = `explore (ε=${epsilon.toFixed(2)})`;
    } else {
      // Exploitation — pick worker with max Q-value
      let bestQ = -Infinity;
      for (const w of workers) {
        const q = getQValue(qEntry, w._id);
        if (q > bestQ) { bestQ = q; chosenWorker = w; }
      }
      // If all Q-values are 0 (cold start), fall back to load heuristic
      if (bestQ === 0) {
        workers.sort((a, b) =>
          (loadMap[a._id.toString()] || 0) - (loadMap[b._id.toString()] || 0)
        );
        chosenWorker = workers[0];
        selectionMethod = `cold-start heuristic`;
      } else {
        selectionMethod = `exploit (Q=${bestQ.toFixed(2)}, ε=${epsilon.toFixed(2)})`;
      }
    }

    const activeLoad = loadMap[chosenWorker._id.toString()] || 0;
    return {
      worker: chosenWorker,
      activeComplaintCount: activeLoad,
      rlState: state,
      rlAction: chosenWorker._id.toString(),
      reason: `RL agent selected ${chosenWorker.name} [${selectionMethod}] — load: ${activeLoad} complaints`,
    };
  } catch (err) {
    console.error('[RL Assignment] error:', err.message);
    return null;
  }
};

// ─── Reward: Call this after complaint resolves / SLA breaches / reopens ─────

/**
 * applyReward
 * ───────────
 * Updates Q(state, action) using the Bellman equation once an outcome is known.
 * Called automatically by the complaint update controller.
 *
 * @param {Object} opts
 * @param {string} opts.rlState    — the state key stored at assignment time
 * @param {string} opts.rlAction   — workerId chosen by the RL agent
 * @param {boolean} opts.metSLA    — true if resolved within SLA
 * @param {boolean} opts.reopened  — true if complaint was reopened
 * @param {number}  opts.feedback  — feedback rating 1–5 (or null)
 */
const applyReward = async ({ rlState, rlAction, metSLA, reopened = false, feedback = null }) => {
  try {
    if (!rlState || !rlAction) return;

    let reward = 0;
    if (metSLA)    reward += 20;
    else           reward -= 20;
    if (reopened)  reward -= 30;
    if (feedback !== null) {
      // Map 1–5 rating to bonus −5…+10
      reward += Math.round((feedback - 3) * 5);
    }

    const entry = await getOrCreateEntry(rlState);
    const oldQ  = getQValue(entry, rlAction);

    // Simplified Bellman: no next-state needed (episodic, single-assignment task)
    // Q(s,a) ← Q(s,a) + α * (r − Q(s,a))
    const newQ = oldQ + ALPHA * (reward - oldQ);
    await setQValue(entry, rlAction, newQ);

    console.log(`[RL Reward] state="${rlState}" action=${rlAction} r=${reward} Q: ${oldQ.toFixed(2)} → ${newQ.toFixed(2)}`);
  } catch (err) {
    console.error('[RL Reward] failed:', err.message);
  }
};

// ─── Admin: Inspect the Q-table ──────────────────────────────────────────────

/**
 * getQTableSummary
 * ────────────────
 * Returns top learned policies for an admin AI insights panel.
 */
const getQTableSummary = async (limit = 20) => {
  const entries = await QTable.find({ visitCount: { $gt: 0 } })
    .sort({ visitCount: -1 }).limit(limit).lean();

  return entries.map(e => ({
    state: e.state,
    visits: e.visitCount,
    topActions: Object.fromEntries(
      [...(e.actions || new Map())]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    ),
  }));
};

module.exports = { findBestWorkerRL, applyReward, getQTableSummary };

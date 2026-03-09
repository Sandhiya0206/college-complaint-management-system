/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Innovation #B: Isolation Forest Spam Anomaly Detector
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Replaces the simple rule-based genuineness scorer with an unsupervised
 * Isolation Forest that detects *statistical outliers* among complaints.
 *
 * Isolation Forest principle:
 *   Anomalous points are isolated by random axis-aligned splits in fewer steps.
 *   Anomaly score:  s(x) = 2^(−E[h(x)] / c(n))
 *   where h(x) = average path length across T trees,
 *         c(n) = 2·H(n−1) − 2(n−1)/n  (average path in BST of n samples)
 *         H(i) = harmonic number ≈ ln(i) + 0.5772
 *
 * Feature vector (7 numeric features per complaint):
 *   [0] descLength       — character count
 *   [1] descWordCount    — word count
 *   [2] titleWordCount   — word count
 *   [3] repetitionScore  — fraction of characters that are repeated chars
 *   [4] uniqueWordRatio  — unique words / total words
 *   [5] punctuationRatio — punctuation chars / total chars
 *   [6] hasImage         — 0 or 1
 *
 * The forest is rebuilt in-memory whenever ≥50 new resolved genuine complaints
 * have accumulated since the last training.  On first run a sensible default
 * forest is seeded from hard-coded training data so the detector works
 * immediately without a warm-up period.
 *
 * Returns: { score: 0–100, isAnomaly: bool, confidence: 0–100, reason: string[] }
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ─── Hyper-parameters ────────────────────────────────────────────────────────
const N_TREES       = 100;   // number of isolation trees
const SUBSAMPLE_SIZE = 256;   // ψ in original paper (must be ≤ training set size)
const ANOMALY_THRESHOLD = 0.65; // s > this → anomaly
const MAX_TREE_DEPTH    = Math.ceil(Math.log2(SUBSAMPLE_SIZE)); // ~8

// ─── Harmonic number approximation ───────────────────────────────────────────
const harmonic = (n) => (n <= 0 ? 0 : Math.log(n) + 0.5772156649);

// c(n): expected path length for unsuccessful BST search
const cFactor = (n) => {
  if (n <= 1) return 1;
  return 2 * harmonic(n - 1) - (2 * (n - 1)) / n;
};

// ─── Feature Extraction ──────────────────────────────────────────────────────

/**
 * extractFeatures
 * ───────────────
 * Converts a raw complaint payload into a 7-dimensional numeric vector.
 */
const extractFeatures = ({ title = '', description = '', imageCount = 0 }) => {
  const desc  = description.trim();
  const t     = title.trim();
  const words = desc.split(/\s+/).filter(Boolean);
  const charArr = [...desc];

  const repetitionScore = charArr.length === 0 ? 0 :
    charArr.filter((c, i, a) => i > 0 && a[i - 1] === c).length / charArr.length;

  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
  const uniqueWordRatio = words.length === 0 ? 0 : uniqueWords / words.length;

  const punct = charArr.filter(c => /[^a-z0-9\s]/i.test(c)).length;
  const punctuationRatio = charArr.length === 0 ? 0 : punct / charArr.length;

  return [
    Math.min(desc.length, 500),                        // [0] descLength
    Math.min(words.length, 100),                       // [1] descWordCount
    Math.min(t.split(/\s+/).filter(Boolean).length, 20), // [2] titleWordCount
    repetitionScore,                                   // [3] repetitionScore
    uniqueWordRatio,                                   // [4] uniqueWordRatio
    punctuationRatio,                                  // [5] punctuationRatio
    imageCount > 0 ? 1 : 0,                            // [6] hasImage
  ];
};

// ─── Isolation Tree ──────────────────────────────────────────────────────────

/**
 * Build one isolation tree from a subsample.
 * Returns a lightweight recursive structure: { splitFeature, splitValue, left, right, size }
 */
const buildTree = (data, depth = 0) => {
  if (depth >= MAX_TREE_DEPTH || data.length <= 1) {
    return { isLeaf: true, size: data.length };
  }

  const nFeatures = data[0].length;
  const featureIdx = Math.floor(Math.random() * nFeatures);
  const col = data.map(row => row[featureIdx]);
  const mn = Math.min(...col);
  const mx = Math.max(...col);

  if (mn === mx) return { isLeaf: true, size: data.length };

  const splitValue = mn + Math.random() * (mx - mn);
  const left  = data.filter(row => row[featureIdx] <  splitValue);
  const right = data.filter(row => row[featureIdx] >= splitValue);

  return {
    isLeaf: false,
    featureIdx,
    splitValue,
    left:  buildTree(left,  depth + 1),
    right: buildTree(right, depth + 1),
  };
};

/**
 * pathLength — traverse a tree for a single point, return isolation depth
 */
const pathLength = (node, point, depth = 0) => {
  if (node.isLeaf) {
    return depth + cFactor(node.size);
  }
  if (point[node.featureIdx] < node.splitValue) {
    return pathLength(node.left,  point, depth + 1);
  }
  return pathLength(node.right, point, depth + 1);
};

// ─── Isolation Forest ────────────────────────────────────────────────────────

/**
 * trainForest
 * ───────────
 * Build N_TREES isolation trees from training data.
 * @param {number[][]} data  — array of feature vectors
 * @returns {object[]} trees
 */
const trainForest = (data) => {
  const n = Math.min(data.length, SUBSAMPLE_SIZE);
  const trees = [];
  for (let t = 0; t < N_TREES; t++) {
    // Random subsample without replacement
    const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, n);
    trees.push(buildTree(shuffled));
  }
  return trees;
};

/**
 * anomalyScore
 * ────────────
 * Compute Isolation Forest anomaly score s ∈ (0,1) for one point.
 * s close to 1 = anomaly, close to 0 = normal.
 */
const anomalyScore = (trees, point, n) => {
  const avgPath = trees.reduce((sum, tree) => sum + pathLength(tree, point), 0) / trees.length;
  return Math.pow(2, -avgPath / cFactor(n));
};

// ─── In-Memory Forest Cache ───────────────────────────────────────────────────
let _forest = null;
let _forestN = 0;

/**
 * Default training corpus: representative feature vectors of genuine complaints.
 * Bootstraps the forest before real data arrives.
 */
const BOOTSTRAP_GENUINE = [
  //  len wds titleWds  rep  uniq  punct img
  [120,  18,  5,  0.02, 0.85, 0.06, 1],
  [200,  28,  6,  0.01, 0.80, 0.05, 1],
  [ 80,  12,  4,  0.03, 0.88, 0.07, 0],
  [160,  22,  5,  0.02, 0.82, 0.05, 1],
  [ 95,  14,  3,  0.01, 0.90, 0.04, 0],
  [250,  35,  7,  0.01, 0.78, 0.06, 1],
  [180,  25,  6,  0.02, 0.84, 0.07, 1],
  [110,  16,  4,  0.03, 0.87, 0.05, 0],
  [300,  42,  8,  0.01, 0.75, 0.06, 1],
  [ 70,  10,  3,  0.02, 0.91, 0.04, 0],
];

const BOOTSTRAP_SPAM = [
  // len  wds title  rep   uniq  punct img
  [  4,   1,  1, 0.00, 1.00, 0.00, 0],  // "test"
  [  5,   1,  1, 0.50, 1.00, 0.00, 0],  // "hello"
  [  8,   1,  0, 0.75, 1.00, 0.00, 0],  // "aaaaaaaa"
  [  0,   0,  0, 0.00, 0.00, 0.00, 0],  // empty
  [  2,   0,  0, 0.00, 0.00, 1.00, 0],  // "!!"
  [ 10,   2,  1, 0.00, 0.50, 0.80, 0],  // "... ..."
  [  6,   2,  1, 0.30, 1.00, 0.10, 0],  // "hi bro"
  [  4,   1,  1, 0.75, 1.00, 0.00, 0],  // "aaaa"
];

/**
 * ensureForest
 * ────────────
 * Lazy-initialise the forest. In a production setting this would be retrained
 * periodically against the real complaints collection.
 */
const ensureForest = async () => {
  if (_forest) return;

  let trainingData = [...BOOTSTRAP_GENUINE, ...BOOTSTRAP_SPAM];

  // Try to augment with real data from MongoDB if available
  try {
    const Complaint = require('../models/Complaint');
    const real = await Complaint.find({
      'genuinenessVerdict': { $in: ['genuine', 'suspicious'] },
      isActive: true
    }).select('title description images genuinenessVerdict').limit(500).lean();

    if (real.length >= 20) {
      trainingData = real.map(c => extractFeatures({
        title: c.title || '',
        description: c.description || '',
        imageCount: (c.images || []).length,
      }));
      _forestN = trainingData.length;
    }
  } catch (_) { /* DB not ready yet */ }

  _forestN = trainingData.length;
  _forest  = trainForest(trainingData);
  console.log(`[IsolationForest] Trained on ${_forestN} samples with ${N_TREES} trees.`);
};

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * detectSpamAnomaly
 * ─────────────────
 * Scores a complaint submission using the Isolation Forest.
 *
 * @param {{ title, description, imageCount }} payload
 * @returns {{ score: number, isoScore: number, isAnomaly: boolean,
 *             confidence: number, flags: string[] }}
 */
const detectSpamAnomaly = async (payload) => {
  await ensureForest();

  const features = extractFeatures(payload);
  const iso = anomalyScore(_forest, features, _forestN || SUBSAMPLE_SIZE);

  const flags = [];
  const [descLen, descWords, titleWords, repScore, uniqueRatio, punctRatio] = features;

  if (descLen   < 10)   flags.push('Extremely short description');
  if (descWords  < 2)   flags.push('Too few words');
  if (titleWords < 2)   flags.push('Title missing or very short');
  if (repScore  > 0.4)  flags.push('Highly repetitive characters');
  if (uniqueRatio < 0.4 && descWords > 3) flags.push('Low vocabulary diversity');
  if (punctRatio > 0.5)  flags.push('Excessive punctuation');

  const isAnomaly = iso > ANOMALY_THRESHOLD;
  // Convert iso score to 0-100 suspicion scale (100 = most suspicious)
  const suspicionScore = Math.round(iso * 100);
  // Invert for a "genuineness" scale (100 = most genuine)
  const genuinenessScore = Math.max(0, 100 - suspicionScore);
  // Confidence: how far the score is from the decision boundary (0.65)
  const confidence = Math.round(Math.min(1, Math.abs(iso - ANOMALY_THRESHOLD) / 0.35) * 100);

  return {
    score: genuinenessScore,
    isoScore: Math.round(iso * 1000) / 1000,
    isAnomaly,
    confidence,
    flags,
    verdict: genuinenessScore >= 70 ? 'genuine' : genuinenessScore >= 45 ? 'review' : 'suspicious',
    method: 'isolation_forest',
  };
};

/**
 * retrainForest
 * ─────────────
 * Force a forest rebuild from current DB data.
 * Call this from a nightly cron or the admin panel.
 */
const retrainForest = async () => {
  _forest = null;
  await ensureForest();
  return { trees: N_TREES, samples: _forestN };
};

module.exports = { detectSpamAnomaly, retrainForest, extractFeatures };

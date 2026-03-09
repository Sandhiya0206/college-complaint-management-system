/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Innovation #D: TF-IDF + Cosine Similarity Duplicate Detection
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Replaces the word-overlap Jaccard similarity with proper TF-IDF weighted
 * cosine similarity, which correctly down-weights common campus words
 * (e.g. "hostel", "block", "room") and up-weights rare diagnostic terms
 * (e.g. "tripping", "flooding", "sparking").
 *
 * Algorithm:
 *   1. Build an IDF dictionary from all open complaints in the DB.
 *   2. For each candidate, compute TF-IDF vector of its description.
 *   3. Compute cosine similarity between incoming complaint and each candidate.
 *   4. Combine with category match and location proximity for final score.
 *
 * TF(t, d) = count(t in d) / totalWords(d)
 * IDF(t)   = ln( N / (1 + df(t)) ) + 1    [smoothed IDF]
 * TF-IDF   = TF × IDF
 * cosSim(A,B) = (A · B) / (‖A‖ · ‖B‖)
 * ─────────────────────────────────────────────────────────────────────────────
 */
'use strict';

const Complaint = require('../models/Complaint');

const SIMILARITY_THRESHOLD = 0.40;   // cosine sim ≥ this to be flagged
const MAX_CANDIDATES        = 300;   // how many recent complaints to scan
const LOOKBACK_DAYS         = 30;

// ─── Text utilities ───────────────────────────────────────────────────────────

// Common English + campus stop words to ignore
const STOP_WORDS = new Set([
  'the','a','an','is','in','at','on','to','of','and','or','but','not','for',
  'with','have','has','had','was','are','were','be','been','been','by','from',
  'this','that','it','i','my','we','our','hostel','block','room','floor','wing',
  'building','campus','college','area','place','near','side','no','do','does'
]);

const tokenize = (text = '') =>
  text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));

// ─── TF computation ───────────────────────────────────────────────────────────
const computeTF = (tokens) => {
  const freq = {};
  tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  const total = tokens.length || 1;
  const tf = {};
  Object.entries(freq).forEach(([t, c]) => { tf[t] = c / total; });
  return tf;
};

// ─── IDF from corpus ──────────────────────────────────────────────────────────
const computeIDF = (corpus) => {
  const N = corpus.length;
  const df = {};
  corpus.forEach(tokens => {
    new Set(tokens).forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  const idf = {};
  Object.entries(df).forEach(([t, count]) => {
    // Smoothed IDF: ln(N / (1 + df)) + 1
    idf[t] = Math.log(N / (1 + count)) + 1;
  });
  return idf;
};

// ─── TF-IDF vector ────────────────────────────────────────────────────────────
const tfidfVector = (tf, idf) => {
  const vec = {};
  Object.entries(tf).forEach(([t, freq]) => {
    vec[t] = freq * (idf[t] || Math.log(10) + 1);   // unseen terms get default IDF
  });
  return vec;
};

// ─── Cosine Similarity ────────────────────────────────────────────────────────
const cosineSim = (vecA, vecB) => {
  let dot = 0, normA = 0, normB = 0;
  const keysA = Object.keys(vecA);
  keysA.forEach(k => {
    dot   += (vecA[k] || 0) * (vecB[k] || 0);
    normA += vecA[k] ** 2;
  });
  Object.values(vecB).forEach(v => { normB += v ** 2; });
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// ─── Location Similarity ──────────────────────────────────────────────────────
const locationSim = (locA = '', locB = '') => {
  const tA = tokenize(locA);
  const tB = tokenize(locB);
  if (!tA.length || !tB.length) return 0;
  const sA = new Set(tA), sB = new Set(tB);
  const intersect = [...sA].filter(t => sB.has(t)).length;
  return intersect / (new Set([...sA, ...sB]).size || 1);
};

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * findSimilarComplaintsTFIDF
 * ──────────────────────────
 * Returns up to 5 open complaints most similar to the incoming complaint.
 * Scoring formula:
 *   finalScore = 0.50 × cosSim(desc) + 0.20 × catMatch + 0.20 × locSim + 0.10 × hostelBonus
 *
 * @param {{ category, location, description, hostelBlock }}
 * @returns {Array} scored complaint objects (sorted desc by similarity)
 */
const findSimilarComplaintsTFIDF = async ({ category, location = '', description = '', hostelBlock = '' }) => {
  try {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);

    const candidates = await Complaint.find({
      status: { $nin: ['Resolved', 'Completed', 'Rejected'] },
      isActive: true,
      createdAt: { $gte: since },
    })
      .select('complaintId title category location description hostelBlock status priority createdAt')
      .lean()
      .limit(MAX_CANDIDATES);

    if (candidates.length === 0) return [];

    // ── Build corpus tokens ──
    const corpus = candidates.map(c => tokenize(c.description || ''));
    const incomingTokens = tokenize(description);

    // ── Compute IDF from corpus ──
    const idf = computeIDF([...corpus, incomingTokens]);

    // ── TF-IDF vector for incoming complaint ──
    const incomingVec = tfidfVector(computeTF(incomingTokens), idf);

    // ── Score each candidate ──
    const scored = candidates.map((c, idx) => {
      const candidateVec = tfidfVector(computeTF(corpus[idx]), idf);
      const cos = cosineSim(incomingVec, candidateVec);
      const catMatch = c.category === category ? 1 : 0;
      const locScore = locationSim(c.location, location);
      const hostelBonus = (hostelBlock && c.hostelBlock === hostelBlock) ? 0.10 : 0;

      const finalScore = Math.min(1, 0.50 * cos + 0.20 * catMatch + 0.20 * locScore + hostelBonus);

      return { ...c, similarityScore: Math.round(finalScore * 100), cosSim: Math.round(cos * 100) };
    });

    return scored
      .filter(c => c.similarityScore >= SIMILARITY_THRESHOLD * 100)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);

  } catch (err) {
    console.error('[TF-IDF DuplicateDetection] error:', err.message);
    return [];
  }
};

module.exports = { findSimilarComplaintsTFIDF };

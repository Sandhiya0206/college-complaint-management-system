const express = require('express');
const router = express.Router();
const { createComplaint, getMyComplaints, getComplaintById, getCategories, verifyResolution, submitFeedback, getFeedback } = require('../controllers/complaint.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { uploadMedia } = require('../middleware/upload.middleware');
const notificationService = require('../services/notification.service');
const { findSimilarComplaints } = require('../services/duplicateDetection.service');
const { findSimilarComplaintsTFIDF } = require('../services/tfidfDuplicate.service');
const { analyseSeverity } = require('../services/severityEscalation.service');
const { scoreGenuineness } = require('../services/genuinessScore.service');
const { detectSpamAnomaly } = require('../services/isolationForest.service');
const { predictResolutionTime } = require('../services/resolutionPredictor.service');
const { predictSLABreach } = require('../services/slaPredictor.service');

router.use(verifyJWT);

router.get('/categories', getCategories);
router.get('/my-complaints', requireRole('student'), getMyComplaints);
router.post('/', requireRole('student'), uploadMedia, createComplaint);
router.get('/:id', getComplaintById);
router.put('/:id/verify', requireRole('student'), verifyResolution);
router.post('/:id/feedback', requireRole('student'), submitFeedback);
router.get('/:id/feedback', getFeedback);

/* ── AI endpoints ── */

// Feature #1 (Enhanced): Dual-engine duplicate check — Jaccard + TF-IDF cosine similarity
router.post('/ai/check-duplicate', requireRole('student'), async (req, res, next) => {
  try {
    const { category, location, description, hostelBlock } = req.body;
    // Run both detectors in parallel
    const [similar, tfidfSimilar] = await Promise.all([
      findSimilarComplaints({ category, location, description, hostelBlock }),
      findSimilarComplaintsTFIDF({ category, location, description, hostelBlock }),
    ]);
    // Merge: union of both result sets, remove duplicates by _id, re-sort
    const mergedMap = new Map();
    [...similar, ...tfidfSimilar].forEach(c => {
      const id = c._id.toString();
      if (!mergedMap.has(id) || mergedMap.get(id).similarityScore < c.similarityScore) {
        mergedMap.set(id, c);
      }
    });
    const merged = [...mergedMap.values()]
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);
    res.json({ success: true, similar: merged, hasDuplicates: merged.length > 0, method: 'tfidf_cosine+jaccard' });
  } catch (err) { next(err); }
});

// Feature #2: Severity check (called client-side in real-time)
router.post('/ai/check-severity', requireRole('student'), async (req, res, next) => {
  try {
    const { text } = req.body;
    const result = analyseSeverity(text);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// Feature #16 (Enhanced): Genuineness — rule-based + Isolation Forest anomaly detection
router.post('/ai/genuineness', requireRole('student'), async (req, res, next) => {
  try {
    const [ruleResult, isoResult] = await Promise.all([
      scoreGenuineness(req.body),
      detectSpamAnomaly(req.body),
    ]);
    // Ensemble: weighted average (rule 40%, IForest 60%)
    const ensembleScore = Math.round(ruleResult.score * 0.40 + isoResult.score * 0.60);
    const ensembleVerdict = ensembleScore >= 70 ? 'genuine' : ensembleScore >= 45 ? 'review' : 'suspicious';
    const mergedFlags = [...new Set([...ruleResult.flags, ...isoResult.flags])];
    res.json({
      success: true,
      score: ensembleScore,
      verdict: ensembleVerdict,
      flags: mergedFlags,
      ruleScore: ruleResult.score,
      isoScore: isoResult.score,
      isoRaw: isoResult.isoScore,
      method: 'isolation_forest+rules',
    });
  } catch (err) { next(err); }
});

// Innovation #E: SLA breach probability for a specific complaint assignment
router.post('/ai/sla-risk', requireRole('student'), async (req, res, next) => {
  try {
    const { category, priority, workerId } = req.body;
    const result = await predictSLABreach({ category, priority, workerId });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// Feature #5: ETA prediction
router.get('/ai/eta', requireRole('student'), async (req, res, next) => {
  try {
    const { category, priority } = req.query;
    const result = await predictResolutionTime(category, priority);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// Student notification endpoints
router.get('/notifications/list', requireRole('student'), async (req, res, next) => {
  try {
    const result = await notificationService.getAllNotifications(req.user._id, req.query.page, req.query.limit);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
});

router.put('/notifications/read', requireRole('student'), async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.user._id, req.body.ids);
    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;

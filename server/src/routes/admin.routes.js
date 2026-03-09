const express = require('express');
const router = express.Router();
const {
  getAllComplaints, getDashboardStats, assignComplaint,
  updatePriority, updateStatus, rejectComplaint,
  getWorkers, getWorkerComplaints, getNotifications, markNotificationsRead,
  createWorker, toggleWorkerStatus, deleteWorker,
  editComplaint, softDeleteComplaint, escalateComplaint, bulkAssign, getEscalatedComplaints
} = require('../controllers/admin.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { getHotspots, getRepeatLocations, getCategoryTrend, predictNextWeekVolume, getMaintenanceSuggestions } = require('../services/predictiveAnalytics.service');
const { forecastNextWeekHW, forecastByCategory } = require('../services/holtWinters.service');
const { getAllWorkerPerformance, detectWorkerAnomalies } = require('../services/workerPerformance.service');
const { getQTableSummary } = require('../services/rlAssignment.service');
const { retrainForest } = require('../services/isolationForest.service');
const { learnFromHistory } = require('../services/slaPredictor.service');
const User = require('../models/User');

router.use(verifyJWT, requireRole('admin'));

router.get('/complaints', getAllComplaints);
router.get('/escalated', getEscalatedComplaints);
router.get('/dashboard-stats', getDashboardStats);
router.post('/complaints/bulk-assign', bulkAssign);
router.put('/complaints/:id/assign', assignComplaint);
router.put('/complaints/:id/priority', updatePriority);
router.put('/complaints/:id/status', updateStatus);
router.put('/complaints/:id/reject', rejectComplaint);
router.put('/complaints/:id/escalate', escalateComplaint);
router.put('/complaints/:id', editComplaint);
router.delete('/complaints/:id', softDeleteComplaint);
router.get('/workers', getWorkers);
router.post('/workers', createWorker);
router.put('/workers/:id/toggle', toggleWorkerStatus);
router.delete('/workers/:id', deleteWorker);
router.get('/workers/:id/complaints', getWorkerComplaints);
router.get('/notifications', getNotifications);
router.put('/notifications/read', markNotificationsRead);

/* ── AI Analytics routes (Feature #3, #6, #14) ── */

router.get('/ai/insights', async (req, res, next) => {
  try {
    const [hotspots, repeats, categoryTrend, olsForecast, hwForecast, categoryForecast, suggestions] = await Promise.all([
      getHotspots(8),
      getRepeatLocations(3),
      getCategoryTrend(7),
      predictNextWeekVolume(),          // legacy OLS forecast (kept for compatibility)
      forecastNextWeekHW(),              // Innovation #C: Holt-Winters forecast
      forecastByCategory(),             // Innovation #C: per-category HW forecast
      getMaintenanceSuggestions(),
    ]);
    res.json({
      success: true,
      hotspots,
      repeatLocations: repeats,
      categoryTrend,
      forecast: { ...hwForecast, olsFallback: olsForecast },  // HW primary, OLS as fallback
      categoryForecast,
      maintenanceSuggestions: suggestions,
    });
  } catch (err) { next(err); }
});

// Innovation #A: RL Q-Table inspection
router.get('/ai/rl-table', async (req, res, next) => {
  try {
    const summary = await getQTableSummary(30);
    res.json({ success: true, qtable: summary, description: 'Top learned Q-Learning states for worker assignment' });
  } catch (err) { next(err); }
});

// Innovation #B: Retrain Isolation Forest on demand
router.post('/ai/retrain-forest', async (req, res, next) => {
  try {
    const result = await retrainForest();
    res.json({ success: true, message: 'Isolation Forest retrained', ...result });
  } catch (err) { next(err); }
});

// Innovation #E: Retrain SLA logistic regression on demand
router.post('/ai/retrain-sla', async (req, res, next) => {
  try {
    const result = await learnFromHistory();
    res.json({ success: true, message: 'SLA Predictor retrained', ...result });
  } catch (err) { next(err); }
});

router.get('/ai/worker-performance', async (req, res, next) => {
  try {
    const workers = await User.find({ role: 'worker', isActive: true }).select('name email department').lean();
    const [performance, anomalies] = await Promise.all([
      getAllWorkerPerformance(workers),
      detectWorkerAnomalies(workers.map(w => w._id)),
    ]);
    res.json({ success: true, performance, anomalies });
  } catch (err) { next(err); }
});

module.exports = router;

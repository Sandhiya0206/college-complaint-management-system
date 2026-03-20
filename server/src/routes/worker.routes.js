const express = require('express');
const router = express.Router();
const {
  getAssignedComplaints, getComplaintById, startWork,
  completeComplaint, updateStatus, generateStatusDraft,
  getWorkerStats, getNotifications, markNotificationsRead
} = require('../controllers/worker.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { uploadImages } = require('../middleware/upload.middleware');

router.use(verifyJWT, requireRole('worker'));

router.get('/assigned-complaints', getAssignedComplaints);
router.get('/complaints/:id', getComplaintById);
router.put('/complaints/:id/start', startWork);
router.put('/complaints/:id/status', uploadImages, updateStatus);
router.put('/complaints/:id/complete', uploadImages, completeComplaint);
router.get('/stats', getWorkerStats);
router.get('/notifications', getNotifications);
router.put('/notifications/read', markNotificationsRead);
router.post('/complaints/:id/ai-draft', generateStatusDraft);

module.exports = router;

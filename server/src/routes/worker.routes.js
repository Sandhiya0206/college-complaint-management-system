const express = require('express');
const router = express.Router();
const {
  getAssignedComplaints, getComplaintById, startWork,
  completeComplaint, updateStatus, getWorkerStats, getNotifications, markNotificationsRead
} = require('../controllers/worker.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { uploadImages } = require('../middleware/upload.middleware');
const Complaint = require('../models/Complaint');

router.use(verifyJWT, requireRole('worker'));

router.get('/assigned-complaints', getAssignedComplaints);
router.get('/complaints/:id', getComplaintById);
router.put('/complaints/:id/start', startWork);
router.put('/complaints/:id/status', uploadImages, updateStatus);
router.put('/complaints/:id/complete', uploadImages, completeComplaint);
router.get('/stats', getWorkerStats);
router.get('/notifications', getNotifications);
router.put('/notifications/read', markNotificationsRead);

/* Feature #9: AI draft status update */
router.get('/complaints/:id/ai-draft', async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .select('title category location status priority description')
      .lean();
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });

    const statusVerbs = { 'In Progress': 'is currently being addressed', 'On Hold': 'is temporarily on hold', 'Resolved': 'has been resolved' };
    const priorityContext = { High: 'As this is a high-priority issue, we are treating it urgently.', Medium: 'We are working to resolve this in a timely manner.', Low: 'We will address this as soon as resources are available.' };
    const verb = statusVerbs[complaint.status] || 'is being handled';
    const draft = `Your ${complaint.category} complaint ("${complaint.title}") at ${complaint.location} ${verb}. ${priorityContext[complaint.priority] || ''} You will be notified once the work is completed. Thank you for your patience.`;

    res.json({ success: true, draft });
  } catch (err) { next(err); }
});

module.exports = router;

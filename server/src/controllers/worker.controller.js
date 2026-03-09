const Complaint = require('../models/Complaint');
const notificationService = require('../services/notification.service');
const { SOCKET_EVENTS, ROOMS } = require('../utils/socketEvents');
const path = require('path');

// @desc    Get assigned complaints for worker
// @route   GET /api/worker/assigned-complaints
const getAssignedComplaints = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { assignedTo: req.user._id };
    if (status) query.status = status;
    else query.status = { $nin: ['Resolved', 'Rejected'] };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('studentId', 'name studentId')
        .sort({ priority: -1, createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Complaint.countDocuments(query)
    ]);

    // Sort by priority: High first
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    complaints.sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1));

    res.status(200).json({
      success: true,
      complaints,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single complaint (worker)
// @route   GET /api/worker/complaints/:id
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('studentId', 'name studentId')
      .populate('statusHistory.updatedBy', 'name role');

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (complaint.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this complaint' });
    }

    res.status(200).json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Start work on complaint
// @route   PUT /api/worker/complaints/:id/start
const startWork = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const complaint = await Complaint.findById(req.params.id).populate('studentId', '_id name');

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your complaint' });
    }

    complaint.status = 'In Progress';
    complaint.statusHistory.push({
      status: 'In Progress',
      updatedBy: req.user._id,
      timestamp: new Date(),
      remarks: 'Work started by worker',
      isAutoUpdate: false
    });
    await complaint.save();

    await notificationService.createNotification(
      complaint.studentId._id, 'status_changed',
      'Work Started', `Work has started on your ${complaint.category} complaint`,
      complaint._id
    );

    if (io) {
      io.to(ROOMS.STUDENT(complaint.studentId._id)).emit(SOCKET_EVENTS.STATUS_CHANGED, {
        complaintId: complaint._id, newStatus: 'In Progress', updatedBy: req.user.name
      });
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.STATUS_CHANGED, {
        complaintId: complaint._id, newStatus: 'In Progress'
      });
    }

    res.status(200).json({ success: true, message: 'Work started', complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Complete complaint
// @route   PUT /api/worker/complaints/:id/complete
const completeComplaint = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const io = req.app.get('io');

    if (!remarks || remarks.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Resolution remarks must be at least 10 characters' });
    }

    const complaint = await Complaint.findById(req.params.id).populate('studentId', '_id name email');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your complaint' });
    }

    const resolutionImages = req.files?.map(f => `/uploads/${path.basename(f.path)}`) || [];

    complaint.status = 'Resolved';
    complaint.resolutionRemarks = remarks;
    complaint.resolutionImages = resolutionImages;
    complaint.completedAt = new Date();
    complaint.statusHistory.push({
      status: 'Resolved',
      updatedBy: req.user._id,
      timestamp: new Date(),
      remarks: `Resolved: ${remarks}`,
      isAutoUpdate: false
    });
    await complaint.save();

    await notificationService.createNotification(
      complaint.studentId._id, 'complaint_resolved',
      'Complaint Resolved! ✅',
      `Your ${complaint.category} complaint at ${complaint.location} has been resolved!`,
      complaint._id
    );

    if (io) {
      io.to(ROOMS.STUDENT(complaint.studentId._id)).emit(SOCKET_EVENTS.COMPLAINT_RESOLVED, {
        complaintId: complaint._id,
        remarks,
        resolutionImages,
        completedAt: complaint.completedAt
      });
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.COMPLAINT_RESOLVED, {
        complaintId: complaint._id, complaint
      });
      io.to(ROOMS.WORKER(req.user._id)).emit(SOCKET_EVENTS.STATUS_CHANGED, {
        complaintId: complaint._id, newStatus: 'Resolved'
      });
    }

    res.status(200).json({ success: true, message: 'Complaint resolved successfully!', complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Update complaint status (On Hold, In Progress, etc.) with remarks & proof
// @route   PUT /api/worker/complaints/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const io = req.app.get('io');

    const ALLOWED = ['In Progress', 'On Hold', 'Resolved'];
    if (!ALLOWED.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${ALLOWED.join(', ')}` });
    }
    if (!remarks || remarks.trim().length < 20) {
      return res.status(400).json({ success: false, message: 'Remarks must be at least 20 characters' });
    }

    const complaint = await Complaint.findById(req.params.id).populate('studentId', '_id name email');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your complaint' });
    }

    const proofImages = req.files?.map(f => `/uploads/${path.basename(f.path)}`) || [];

    if (status === 'Resolved' && proofImages.length === 0 && !complaint.resolutionImages?.length) {
      return res.status(400).json({ success: false, message: 'Proof images are required when marking as Resolved' });
    }

    complaint.status = status;
    complaint.statusHistory.push({ status, updatedBy: req.user._id, timestamp: new Date(), remarks, isAutoUpdate: false, proofImages });
    if (status === 'Resolved') {
      complaint.resolutionRemarks = remarks;
      complaint.resolutionImages = proofImages;
      complaint.completedAt = new Date();
    }
    await complaint.save();

    await notificationService.createNotification(
      complaint.studentId._id, 'status_changed',
      `Complaint ${status}`,
      `Your ${complaint.category} complaint is now: ${status}`,
      complaint._id
    );

    if (io) {
      io.to(ROOMS.STUDENT(complaint.studentId._id)).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, newStatus: status, updatedBy: req.user.name });
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, newStatus: status });
    }

    res.status(200).json({ success: true, message: `Status updated to ${status}`, complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Get worker stats
// @route   GET /api/worker/stats
const getWorkerStats = async (req, res, next) => {
  try {
    const workerId = req.user._id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [assigned, inProgress, completedToday, completedTotal, categoryBreakdown] = await Promise.all([
      Complaint.countDocuments({ assignedTo: workerId, status: 'Assigned' }),
      Complaint.countDocuments({ assignedTo: workerId, status: 'In Progress' }),
      Complaint.countDocuments({ assignedTo: workerId, status: 'Resolved', completedAt: { $gte: todayStart } }),
      Complaint.countDocuments({ assignedTo: workerId, status: 'Resolved' }),
      Complaint.aggregate([
        { $match: { assignedTo: workerId, status: 'Resolved' } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      stats: { assigned, inProgress, completedToday, completedTotal, categoryBreakdown }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get worker notifications
// @route   GET /api/worker/notifications
const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getAllNotifications(req.user._id, req.query.page, req.query.limit);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notifications read
// @route   PUT /api/worker/notifications/read
const markNotificationsRead = async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.user._id, req.body.ids);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAssignedComplaints,
  getComplaintById,
  startWork,
  completeComplaint,
  updateStatus,
  getWorkerStats,
  getNotifications,
  markNotificationsRead
};

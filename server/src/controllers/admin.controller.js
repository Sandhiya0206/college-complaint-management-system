const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const notificationService = require('../services/notification.service');
const { SOCKET_EVENTS, ROOMS } = require('../utils/socketEvents');

// @desc    Get all complaints (admin)
// @route   GET /api/admin/complaints
const getAllComplaints = async (req, res, next) => {
  try {
    const {
      status, category, priority, workerId,
      dateFrom, dateTo, aiConfidenceMin, isAutoAssigned,
      search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (workerId) query.assignedTo = workerId;
    if (isAutoAssigned !== undefined) query.isAutoAssigned = isAutoAssigned === 'true';
    if (aiConfidenceMin) query['aiAnalysis.confidence'] = { $gte: parseFloat(aiConfidenceMin) };
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    if (search) {
      query.$or = [
        { complaintId: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('studentId', 'name email studentId')
        .populate('assignedTo', 'name email department')
        .populate('assignedBy', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Complaint.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      complaints,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard-stats
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const [
      total,
      byStatus,
      byCategory,
      byPriority,
      resolvedToday,
      autoAssignedCount,
      overriddenCount,
      last30DaysRaw,
      workerWorkload,
      escalatedCount,
      todayNewCount,
      yesterdayNewCount
    ] = await Promise.all([
      Complaint.countDocuments({ isActive: true }),
      Complaint.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Complaint.countDocuments({ isActive: true, status: 'Resolved', completedAt: { $gte: todayStart } }),
      Complaint.countDocuments({ isActive: true, isAutoAssigned: true }),
      Complaint.countDocuments({ isActive: true, 'aiAnalysis.studentOverrode': true }),
      Complaint.aggregate([
        { $match: { isActive: true, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Complaint.aggregate([
        { $match: { assignedTo: { $ne: null }, status: { $nin: ['Resolved', 'Rejected', 'Completed'] }, isActive: true } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'worker' } },
        { $unwind: '$worker' },
        { $project: { workerName: '$worker.name', department: '$worker.department', activeComplaints: '$count' } }
      ]),
      Complaint.countDocuments({ isActive: true, isEscalated: true }),
      Complaint.countDocuments({ isActive: true, createdAt: { $gte: todayStart } }),
      Complaint.countDocuments({ isActive: true, createdAt: { $gte: yesterdayStart, $lt: todayStart } })
    ]);

    const statusMap = {};
    byStatus.forEach(({ _id, count }) => statusMap[_id] = count);
    const categoryMap = {};
    byCategory.forEach(({ _id, count }) => categoryMap[_id] = count);
    const priorityMap = {};
    byPriority.forEach(({ _id, count }) => priorityMap[_id] = count);

    const aiAccuracy = total > 0
      ? Math.round(((total - overriddenCount) / total) * 100)
      : 100;

    res.status(200).json({
      success: true,
      stats: {
        total,
        byStatus: statusMap,
        byCategory: categoryMap,
        byPriority: priorityMap,
        resolvedToday,
        autoAssignedCount,
        overriddenCount,
        aiAccuracy,
        complaintsLast30Days: last30DaysRaw,
        workerWorkload,
        escalatedCount,
        todayNewCount,
        yesterdayNewCount,
        todayTrend: yesterdayNewCount > 0 ? Math.round(((todayNewCount - yesterdayNewCount) / yesterdayNewCount) * 100) : 0,
        highPriorityOpen: await Complaint.countDocuments({ isActive: true, priority: 'High', status: { $nin: ['Resolved', 'Rejected', 'Completed'] } }),
        inProgress: statusMap['In Progress'] || 0
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign complaint to worker
// @route   PUT /api/admin/complaints/:id/assign
const assignComplaint = async (req, res, next) => {
  try {
    const { workerId } = req.body;
    const io = req.app.get('io');

    const [complaint, worker] = await Promise.all([
      Complaint.findById(req.params.id),
      User.findById(workerId)
    ]);

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (!worker || worker.role !== 'worker') return res.status(400).json({ success: false, message: 'Invalid worker' });

    const oldWorker = complaint.assignedTo;

    complaint.assignedTo = workerId;
    complaint.assignedBy = req.user._id;
    complaint.isAutoAssigned = false;
    complaint.assignedAt = new Date();
    complaint.status = 'Assigned';
    complaint.statusHistory.push({
      status: 'Assigned',
      updatedBy: req.user._id,
      timestamp: new Date(),
      remarks: `Manually assigned to ${worker.name} by admin`
    });

    await complaint.save();
    await complaint.populate([
      { path: 'studentId', select: 'name email studentId' },
      { path: 'assignedTo', select: 'name email department' }
    ]);

    // Notifications
    await Promise.all([
      notificationService.createNotification(workerId, 'complaint_assigned', 'Complaint Assigned', `Complaint ${complaint.complaintId} has been assigned to you`, complaint._id),
      notificationService.createNotification(complaint.studentId._id, 'status_changed', 'Complaint Assigned', `Your complaint has been assigned to ${worker.name}`, complaint._id)
    ]);

    // Socket events
    if (io) {
      if (oldWorker && oldWorker.toString() !== workerId) {
        io.to(ROOMS.WORKER(oldWorker)).emit(SOCKET_EVENTS.WORKER_REASSIGNED, { complaintId: complaint._id, fromWorker: oldWorker, toWorker: workerId });
      }
      io.to(ROOMS.WORKER(workerId)).emit(SOCKET_EVENTS.COMPLAINT_ASSIGNED, { complaint, studentInfo: complaint.studentId });
      io.to(ROOMS.STUDENT(complaint.studentId._id)).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, newStatus: 'Assigned', assignedTo: worker.name });
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, newStatus: 'Assigned', complaint });
    }

    res.status(200).json({ success: true, message: `Complaint assigned to ${worker.name}`, complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Update complaint priority
// @route   PUT /api/admin/complaints/:id/priority
const updatePriority = async (req, res, next) => {
  try {
    const { priority } = req.body;
    const io = req.app.get('io');

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { priority, $push: { statusHistory: { status: complaint?.status, updatedBy: req.user._id, timestamp: new Date(), remarks: `Priority changed to ${priority} by admin` } } },
      { new: true }
    );

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (io) {
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, priority });
    }

    res.status(200).json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Update complaint status
// @route   PUT /api/admin/complaints/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const io = req.app.get('io');

    const complaint = await Complaint.findById(req.params.id).populate('studentId', '_id name');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    complaint.status = status;
    complaint.statusHistory.push({ status, updatedBy: req.user._id, timestamp: new Date(), remarks });
    if (status === 'Resolved') complaint.completedAt = new Date();
    await complaint.save();

    if (io) {
      io.to(ROOMS.STUDENT(complaint.studentId._id)).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, newStatus: status });
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, newStatus: status });
    }

    res.status(200).json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject complaint
// @route   PUT /api/admin/complaints/:id/reject
const rejectComplaint = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const io = req.app.get('io');

    const complaint = await Complaint.findById(req.params.id).populate('studentId', '_id name');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    complaint.status = 'Rejected';
    complaint.rejectionReason = reason;
    complaint.statusHistory.push({ status: 'Rejected', updatedBy: req.user._id, timestamp: new Date(), remarks: reason });
    await complaint.save();

    await notificationService.createNotification(
      complaint.studentId._id, 'complaint_rejected',
      'Complaint Rejected', `Your complaint ${complaint.complaintId} was rejected. Reason: ${reason}`,
      complaint._id
    );

    if (io) {
      io.to(ROOMS.STUDENT(complaint.studentId._id)).emit(SOCKET_EVENTS.COMPLAINT_REJECTED, { complaintId: complaint._id, reason });
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, newStatus: 'Rejected' });
    }

    res.status(200).json({ success: true, message: 'Complaint rejected', complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all workers with stats
// @route   GET /api/admin/workers
const getWorkers = async (req, res, next) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('-password').lean();

    const workerStats = await Promise.all(
      workers.map(async (worker) => {
        const [active, completed] = await Promise.all([
          Complaint.countDocuments({ assignedTo: worker._id, status: { $nin: ['Resolved', 'Rejected'] } }),
          Complaint.countDocuments({ assignedTo: worker._id, status: 'Resolved' })
        ]);

        const completionRate = (active + completed) > 0
          ? Math.round((completed / (active + completed)) * 100)
          : 0;

        return { ...worker, activeComplaintCount: active, completedCount: completed, completionRate };
      })
    );

    res.status(200).json({ success: true, workers: workerStats });
  } catch (err) {
    next(err);
  }
};

// @desc    Get worker's complaints
// @route   GET /api/admin/workers/:id/complaints
const getWorkerComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ assignedTo: req.params.id })
      .populate('studentId', 'name email studentId')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, complaints });
  } catch (err) {
    next(err);
  }
};

// @desc    Get notifications for admin
// @route   GET /api/admin/notifications
const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getAllNotifications(req.user._id, req.query.page, req.query.limit);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/admin/notifications/read
const markNotificationsRead = async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.user._id, req.body.ids);
    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new worker (admin only)
// @route   POST /api/admin/workers
const createWorker = async (req, res, next) => {
  try {
    const { name, email, password, department, phone } = req.body;
    if (!name || !email || !password || !department) {
      return res.status(400).json({ success: false, message: 'Name, email, password and department are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const worker = await User.create({ name, email, password, role: 'worker', department, phone });
    const { password: _, ...workerData } = worker.toObject();
    res.status(201).json({ success: true, worker: workerData });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle worker active/inactive
// @route   PUT /api/admin/workers/:id/toggle
const toggleWorkerStatus = async (req, res, next) => {
  try {
    const worker = await User.findOne({ _id: req.params.id, role: 'worker' });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    worker.isActive = !worker.isActive;
    await worker.save();
    res.status(200).json({ success: true, isActive: worker.isActive });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete worker
// @route   DELETE /api/admin/workers/:id
const deleteWorker = async (req, res, next) => {
  try {
    const worker = await User.findOneAndDelete({ _id: req.params.id, role: 'worker' });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.status(200).json({ success: true, message: 'Worker deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── NEW FEATURE: Edit complaint ──────────────────────────────────────────────
// @route PUT /api/admin/complaints/:id
const editComplaint = async (req, res, next) => {
  try {
    const { description, location, category, priority } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (description !== undefined) complaint.description = description;
    if (location !== undefined) complaint.location = location;
    if (category !== undefined) complaint.category = category;
    if (priority !== undefined) complaint.priority = priority;
    complaint.statusHistory.push({ status: complaint.status, updatedBy: req.user._id, timestamp: new Date(), remarks: `Details edited by admin`, isAutoUpdate: false });
    await complaint.save();
    res.status(200).json({ success: true, message: 'Complaint updated', complaint });
  } catch (err) {
    next(err);
  }
};

// ─── NEW FEATURE: Soft delete complaint ───────────────────────────────────────
// @route DELETE /api/admin/complaints/:id
const softDeleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.status(200).json({ success: true, message: 'Complaint deleted (soft)' });
  } catch (err) {
    next(err);
  }
};

// ─── NEW FEATURE: Manual escalate ─────────────────────────────────────────────
// @route PUT /api/admin/complaints/:id/escalate
const escalateComplaint = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const io = req.app.get('io');
    const complaint = await Complaint.findById(req.params.id).populate('studentId', '_id').populate('assignedTo', '_id name');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    complaint.isEscalated = true;
    complaint.escalatedAt = new Date();
    complaint.escalatedBy = req.user._id;
    complaint.escalationReason = reason || 'Manually escalated by admin';
    complaint.escalationLevel = (complaint.escalationLevel || 0) + 1;
    complaint.statusHistory.push({ status: complaint.status, updatedBy: req.user._id, timestamp: new Date(), remarks: `Escalated: ${reason || 'Admin escalation'}`, isAutoUpdate: false });
    await complaint.save();

    if (complaint.assignedTo) {
      await notificationService.createNotification(complaint.assignedTo._id, 'complaint_assigned', '⚠️ Complaint Escalated',
        `Complaint ${complaint.complaintId} has been escalated. Reason: ${reason}`, complaint._id);
      if (io) io.to(ROOMS.WORKER(complaint.assignedTo._id)).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, isEscalated: true });
    }

    res.status(200).json({ success: true, message: 'Complaint escalated', complaint });
  } catch (err) {
    next(err);
  }
};

// ─── NEW FEATURE: Bulk assign ─────────────────────────────────────────────────
// @route POST /api/admin/complaints/bulk-assign
const bulkAssign = async (req, res, next) => {
  try {
    const { complaintIds, workerId, slaHours = 24 } = req.body;
    const io = req.app.get('io');

    if (!complaintIds?.length || !workerId) {
      return res.status(400).json({ success: false, message: 'complaintIds and workerId are required' });
    }

    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker') return res.status(400).json({ success: false, message: 'Invalid worker' });

    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
    const assignedAt = new Date();

    await Promise.all(complaintIds.map(async (id) => {
      const complaint = await Complaint.findById(id).populate('studentId', '_id name');
      if (!complaint) return;
      complaint.assignedTo = workerId;
      complaint.assignedBy = req.user._id;
      complaint.isAutoAssigned = false;
      complaint.assignedAt = assignedAt;
      complaint.slaHours = slaHours;
      complaint.slaDeadline = slaDeadline;
      complaint.status = 'Assigned';
      complaint.statusHistory.push({ status: 'Assigned', updatedBy: req.user._id, timestamp: assignedAt, remarks: `Bulk assigned to ${worker.name}`, isAutoUpdate: false });
      await complaint.save();

      await Promise.all([
        notificationService.createNotification(workerId, 'complaint_assigned', 'New Complaint Assigned',
          `Complaint ${complaint.complaintId} assigned to you`, complaint._id),
        notificationService.createNotification(complaint.studentId._id, 'status_changed', 'Complaint Assigned',
          `Your complaint has been assigned to ${worker.name}`, complaint._id)
      ]);
    }));

    if (io) io.to(ROOMS.WORKER(workerId)).emit(SOCKET_EVENTS.COMPLAINT_ASSIGNED, { bulkAssigned: true, count: complaintIds.length });

    res.status(200).json({ success: true, message: `${complaintIds.length} complaints assigned to ${worker.name}` });
  } catch (err) {
    next(err);
  }
};

// ─── NEW FEATURE: Get escalated complaints ────────────────────────────────────
// @route GET /api/admin/escalated
const getEscalatedComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ isEscalated: true, isActive: true })
      .populate('studentId', 'name email studentId')
      .populate('assignedTo', 'name email department')
      .populate('escalatedBy', 'name')
      .sort({ escalatedAt: -1 })
      .lean();
    res.status(200).json({ success: true, complaints });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllComplaints,
  getDashboardStats,
  assignComplaint,
  updatePriority,
  updateStatus,
  rejectComplaint,
  getWorkers,
  getWorkerComplaints,
  getNotifications,
  markNotificationsRead,
  createWorker,
  toggleWorkerStatus,
  deleteWorker,
  editComplaint,
  softDeleteComplaint,
  escalateComplaint,
  bulkAssign,
  getEscalatedComplaints
};

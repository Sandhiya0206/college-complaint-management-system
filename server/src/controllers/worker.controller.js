const Complaint = require('../models/Complaint');
const notificationService = require('../services/notification.service');
const { SOCKET_EVENTS, ROOMS } = require('../utils/socketEvents');
const path = require('path');

const cleanDraftText = (value = '') => String(value)
  .replace(/```[a-z]*\n?/gi, '')
  .replace(/```/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 900);

const buildTemplateDraft = ({ complaint, status, keywords }) => {
  const base = {
    'In Progress': `Work is actively in progress for the ${complaint.category} complaint at ${complaint.location}. Initial inspection has been completed and corrective steps are underway.`,
    'On Hold': `Work for the ${complaint.category} complaint at ${complaint.location} is temporarily on hold. We are waiting for the required dependency before continuing with the fix.`,
    'Resolved': `The ${complaint.category} complaint at ${complaint.location} has been resolved after verification on site. The issue is fixed and the area has been restored for normal use.`
  };

  const keywordLine = keywords
    ? ` Work details: ${keywords}.`
    : '';

  return cleanDraftText(`${base[status] || base['In Progress']}${keywordLine} Thank you for your patience.`);
};

const generateGroqDraft = async ({ complaint, status, keywords }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const apiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
  const model = process.env.GROQ_TEXT_MODEL || process.env.GROQ_VISION_MODEL || 'llama-3.3-70b-versatile';
  const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 20000);

  const systemPrompt = [
    'You draft professional worker status updates for campus maintenance complaints.',
    'Write only plain text (no JSON, no markdown).',
    'Keep it factual, clear, and grammatically correct.',
    'Length: 2 to 4 sentences.',
    'Must reflect the selected status exactly: In Progress, On Hold, or Resolved.',
    'Incorporate worker-provided keywords accurately without adding fake details.',
    'Tone: operational and polite.'
  ].join(' ');

  const userPrompt = [
    `Complaint Title: ${complaint.title}`,
    `Category: ${complaint.category}`,
    `Location: ${complaint.location}`,
    `Priority: ${complaint.priority}`,
    `Selected Status: ${status}`,
    `Worker Keywords: ${keywords || 'Not provided'}`,
    'Generate the final status update text now.'
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const cleaned = cleanDraftText(content);
    return cleaned || null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

// @desc    Get assigned complaints for worker
// @route   GET /api/worker/assigned-complaints
const getAssignedComplaints = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { assignedTo: req.user._id, isActive: { $ne: false } };
    if (status) query.status = status;
    else query.status = { $nin: ['Resolved', 'Rejected'] };

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
    const skip = (parsedPage - 1) * parsedLimit;
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('studentId', 'name studentId')
        .sort({ assignedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Complaint.countDocuments(query)
    ]);

    // Sort by priority: High first
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    complaints.sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1));

    res.status(200).json({
      success: true,
      complaints,
      pagination: { total, page: parsedPage, pages: Math.ceil(total / parsedLimit) }
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

// @desc    Generate AI worker draft from status + worker keywords
// @route   POST /api/worker/complaints/:id/ai-draft
const generateStatusDraft = async (req, res, next) => {
  try {
    const { status, keywords } = req.body || {};
    const selectedStatus = String(status || '').trim();
    const cleanedKeywords = String(keywords || '').replace(/\s+/g, ' ').trim();
    const allowed = ['In Progress', 'On Hold', 'Resolved'];

    if (!allowed.includes(selectedStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status for AI draft' });
    }

    const complaint = await Complaint.findById(req.params.id)
      .select('title category location priority assignedTo aiDraftUpdate')
      .lean();

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your complaint' });
    }

    const aiDraft = await generateGroqDraft({
      complaint,
      status: selectedStatus,
      keywords: cleanedKeywords,
    });

    const draft = aiDraft || buildTemplateDraft({
      complaint,
      status: selectedStatus,
      keywords: cleanedKeywords,
    });

    await Complaint.findByIdAndUpdate(req.params.id, { aiDraftUpdate: draft });

    res.status(200).json({
      success: true,
      draft,
      source: aiDraft ? 'groq' : 'template'
    });
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
      Complaint.countDocuments({ assignedTo: workerId, isActive: { $ne: false }, status: { $in: ['Assigned', 'In Progress', 'On Hold'] } }),
      Complaint.countDocuments({ assignedTo: workerId, isActive: { $ne: false }, status: 'In Progress' }),
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
  generateStatusDraft,
  getWorkerStats,
  getNotifications,
  markNotificationsRead
};

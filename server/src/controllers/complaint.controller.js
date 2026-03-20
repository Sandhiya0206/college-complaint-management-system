const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const { analyzeImage } = require('../services/imageAnalysis.service');
const { findBestWorkerForCategory } = require('../services/autoAssignment.service');       // heuristic fallback
const { findBestWorkerRL } = require('../services/rlAssignment.service');                   // Innovation #A: RL agent
const { createNotification } = require('../services/notification.service');
const { SOCKET_EVENTS, ROOMS } = require('../utils/socketEvents');
const Category = require('../models/Category');
const path = require('path');
const { scoreGenuineness } = require('../services/genuinessScore.service');
const { detectSpamAnomaly } = require('../services/isolationForest.service');               // Innovation #B
const { predictResolutionTime } = require('../services/resolutionPredictor.service');
const { processSeverityEscalation } = require('../services/severityEscalation.service');
const { predictSLABreach, onComplaintResolved } = require('../services/slaPredictor.service'); // Innovation #E
const { findSimilarComplaints, mergeDuplicateGroup } = require('../services/duplicateDetection.service');
const { findSimilarComplaintsTFIDF } = require('../services/tfidfDuplicate.service');

const sanitizeText = (value, maxLen = 1000) => {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.slice(0, maxLen);
};

const buildFallbackDescription = (category, location, detectedObjects = []) => {
  const objectNames = (Array.isArray(detectedObjects) ? detectedObjects : [])
    .map((obj) => sanitizeText(obj?.name || obj?.label || '', 40).toLowerCase())
    .filter(Boolean)
    .slice(0, 3);

  const evidence = objectNames.length > 0
    ? ` Detected signs include ${objectNames.join(', ')}.`
    : '';

  return sanitizeText(
    `Reported ${category.toLowerCase()} issue at ${location}. Please inspect the area and complete the required maintenance action.${evidence}`,
    1000
  );
};

const mergeDuplicateCandidates = (...lists) => {
  const mergedMap = new Map();
  lists.flat().forEach((item) => {
    const id = item?._id?.toString();
    if (!id) return;
    if (!mergedMap.has(id) || Number(mergedMap.get(id).similarityScore || 0) < Number(item.similarityScore || 0)) {
      mergedMap.set(id, item);
    }
  });
  return [...mergedMap.values()].sort((a, b) => Number(b.similarityScore || 0) - Number(a.similarityScore || 0));
};

const normalizeComparableText = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const locationTokenSimilarity = (a = '', b = '') => {
  const tokensA = new Set(normalizeComparableText(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalizeComparableText(b).split(' ').filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
};

const pickStrongDuplicate = (candidates = [], studentId, finalCategory, incomingLocation = '') => {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return candidates.find((c) => {
    const similarity = Number(c.similarityScore || 0);
    const sameStudent = c.studentId && studentId && c.studentId.toString() === studentId.toString();
    const sameCategory = c.category === finalCategory;
    const locationSim = locationTokenSimilarity(c.location || '', incomingLocation || '');
    const sameLocation = locationSim >= 0.6;

    if (sameStudent && similarity >= 55) return true;
    if (sameCategory && sameLocation && similarity >= 64) return true;
    return sameCategory && similarity >= 85;
  }) || null;
};

// @desc    Create complaint (full AI pipeline)
// @route   POST /api/complaints
const createComplaint = async (req, res, next) => {
  try {
    const { location, description, category_override, aiData, hostelBlock, roomNumber, title: studentTitle, locationType, buildingName, floorNumber, gender, section, landmark, customLocation } = req.body;
    const studentId = req.user._id;
    const io = req.app.get('io');

    if (!location) {
      return res.status(400).json({ success: false, message: 'Location is required' });
    }

    // Parse AI data from client
    let clientAiData = {};
    try {
      clientAiData = aiData ? JSON.parse(aiData) : {};
    } catch (e) {
      clientAiData = {};
    }

    // Process uploaded images and videos
    const imageFiles = req.files?.images || (req.files && !req.files.images ? req.files : []);
    const videoFiles = req.files?.videos || [];
    const imagePaths = (Array.isArray(imageFiles) ? imageFiles : []).map(f => `/uploads/${path.basename(f.path)}`);
    const videoPaths = (Array.isArray(videoFiles) ? videoFiles : []).map(f => `/uploads/${path.basename(f.path)}`);

    // Server-side AI analysis
    let aiResult = null;
    const allImageFiles = Array.isArray(imageFiles) ? imageFiles : [];
    if (allImageFiles.length > 0) {
      const fs = require('fs');
      const buffer = fs.readFileSync(allImageFiles[0].path);
      aiResult = await analyzeImage(buffer, clientAiData, {
        imagePath: allImageFiles[0].path,
        mimeType: allImageFiles[0].mimetype
      });
    } else if (clientAiData.category) {
      aiResult = {
        category: clientAiData.category,
        priority: clientAiData.priority || 'Medium',
        confidence: clientAiData.confidence || 0.5,
        detectedObjects: clientAiData.detectedObjects || [],
        detectedLabels: clientAiData.predictions || [],
        method: 'keyword_fallback',
        isSafeContent: true
      };
    }

    // Safety check
    if (aiResult && !aiResult.isSafeContent) {
      return res.status(400).json({ success: false, message: 'Image content policy violation. Please upload appropriate images.' });
    }

    // Determine final category
    const studentOverrode = !!category_override;
    const finalCategory = category_override || aiResult?.category || 'Other';
    const finalPriority = aiResult?.priority || 'Medium';
    const finalConfidence = aiResult?.confidence || 0.5;
    const studentTitleClean = sanitizeText(studentTitle, 150);
    const studentDescriptionClean = sanitizeText(description, 1000);
    const aiSuggestedTitle = sanitizeText(aiResult?.suggestedTitle || aiResult?.title || clientAiData?.title, 150);
    const aiSuggestedDescription = sanitizeText(aiResult?.suggestedDescription || aiResult?.description || clientAiData?.description, 1000);

    const autoTitle = studentTitleClean || aiSuggestedTitle || `${finalCategory} Issue at ${location}`;
    const finalDescription = studentDescriptionClean
      || aiSuggestedDescription
      || buildFallbackDescription(finalCategory, location, aiResult?.detectedObjects);

    // Server-enforced duplicate guard to prevent repeated re-submission and re-assignment.
    const [similar, tfidfSimilar] = await Promise.all([
      findSimilarComplaints({
        category: finalCategory,
        location,
        description: finalDescription,
        hostelBlock: hostelBlock || ''
      }),
      findSimilarComplaintsTFIDF({
        category: finalCategory,
        location,
        description: finalDescription,
        hostelBlock: hostelBlock || ''
      })
    ]);

    const duplicateCandidates = mergeDuplicateCandidates(similar, tfidfSimilar);
    const strongDuplicate = pickStrongDuplicate(duplicateCandidates, studentId, finalCategory, location);

    if (strongDuplicate) {
      const mergedComplaint = await mergeDuplicateGroup(strongDuplicate._id, { reporterStudentId: studentId });
      if (mergedComplaint) {
        await mergedComplaint.populate([
          { path: 'studentId', select: 'name email studentId' },
          { path: 'assignedTo', select: 'name email department' }
        ]);

        await createNotification(
          studentId,
          'status_changed',
          'Duplicate Linked To Existing Complaint',
          `A similar complaint (${mergedComplaint.complaintId}) already exists. Your report was linked to it instead of creating a new assignment.`,
          mergedComplaint._id
        );

        return res.status(200).json({
          success: true,
          merged: true,
          duplicateOf: mergedComplaint._id,
          message: `Similar complaint already exists (${mergedComplaint.complaintId}). Your report has been linked to that complaint.`,
          complaint: mergedComplaint,
          assignedWorker: mergedComplaint.assignedTo || null
        });
      }
    }

    // Auto-assign worker — try RL agent first, fall back to heuristic
    let assignmentResult = await findBestWorkerRL(finalCategory, finalPriority);
    if (!assignmentResult) assignmentResult = await findBestWorkerForCategory(finalCategory);

    // Build complaint object
    const complaintData = {
      studentId,
      category: finalCategory,
      title: autoTitle,
      description: finalDescription,
      location,
      images: imagePaths,
      videos: videoPaths,
      hostelBlock: hostelBlock || '',
      roomNumber: roomNumber || '',
      locationType: locationType || '',
      buildingName: buildingName || '',
      floorNumber: floorNumber || '',
      gender: gender || '',
      section: section || '',
      landmark: landmark || '',
      customLocation: customLocation || '',
      priority: finalPriority,
      status: assignmentResult ? 'Assigned' : 'Submitted',
      aiAnalysis: {
        suggestedCategory: aiResult?.category || finalCategory,
        suggestedTitle: aiSuggestedTitle || autoTitle,
        suggestedDescription: aiSuggestedDescription || finalDescription,
        finalCategory,
        confidence: finalConfidence,
        confidenceThreshold: aiResult?.confidenceThreshold,
        isUncertain: aiResult?.isUncertain ?? false,
        uncertaintyReasons: aiResult?.uncertaintyReasons || [],
        topCategories: aiResult?.topCategories || [],
        detectedObjects: aiResult?.detectedObjects || [],
        detectedLabels: aiResult?.detectedLabels || [],
        method: aiResult?.method || 'keyword_fallback',
        modelSource: aiResult?.model_source || aiResult?.modelSource || 'keyword_fallback',
        signalBreakdown: aiResult?.signalBreakdown || [],
        isSafeContent: aiResult?.isSafeContent ?? true,
        studentOverrode,
        analyzedAt: new Date()
      },
      statusHistory: [{
        status: 'Submitted',
        updatedBy: studentId,
        timestamp: new Date(),
        remarks: 'Complaint submitted',
        isAutoUpdate: false
      }]
    };

    if (assignmentResult) {
      const slaHours = 24;
      complaintData.assignedTo = assignmentResult.worker._id;
      complaintData.assignedBy = null;
      complaintData.isAutoAssigned = true;
      complaintData.autoAssignmentReason = assignmentResult.reason;
      complaintData.assignedAt = new Date();
      complaintData.slaHours = slaHours;
      complaintData.slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
      // Innovation #A: persist RL state+action for reward propagation
      if (assignmentResult.rlState) {
        complaintData.rlState  = assignmentResult.rlState;
        complaintData.rlAction = assignmentResult.rlAction;
      }
      complaintData.statusHistory.push({
        status: 'Assigned',
        updatedBy: null,
        timestamp: new Date(),
        remarks: assignmentResult.reason,
        isAutoUpdate: true
      });
    }

    const complaint = await Complaint.create(complaintData);
    await complaint.populate([
      { path: 'studentId', select: 'name email studentId' },
      { path: 'assignedTo', select: 'name email department' }
    ]);

    // Create notifications
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    const notifPromises = admins.map(admin =>
      createNotification(
        admin._id,
        'complaint_created',
        'New Complaint Submitted',
        `${req.user.name} submitted a ${finalCategory} complaint at ${location}`,
        complaint._id
      )
    );

    if (assignmentResult) {
      notifPromises.push(
        createNotification(
          assignmentResult.worker._id,
          'complaint_assigned',
          'New Complaint Assigned',
          `You have been assigned a ${finalCategory} complaint at ${location}`,
          complaint._id
        ),
        createNotification(
          studentId,
          'status_changed',
          'Complaint Auto-Assigned',
          `Your complaint has been automatically assigned to ${assignmentResult.worker.name}`,
          complaint._id
        )
      );
    }

    await Promise.all(notifPromises);

    // Emit socket events
    if (io) {
      io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.COMPLAINT_CREATED, {
        complaint,
        aiAnalysis: aiResult,
        assignedWorker: assignmentResult?.worker || null
      });

      if (assignmentResult) {
        io.to(ROOMS.WORKER(assignmentResult.worker._id)).emit(SOCKET_EVENTS.COMPLAINT_ASSIGNED, {
          complaint,
          aiAnalysis: aiResult,
          studentInfo: { name: req.user.name, studentId: req.user.studentId },
          location
        });
        io.to(ROOMS.STUDENT(studentId)).emit(SOCKET_EVENTS.STATUS_CHANGED, {
          complaintId: complaint._id,
          newStatus: 'Assigned',
          assignedTo: assignmentResult.worker.name,
          timestamp: new Date()
        });
      }
    }

    // ── AI enrichment (non-blocking background tasks) ──
    setImmediate(async () => {
      try {
        const aiUpdates = {};

        // Innovation #B: Isolation Forest + rule ensemble genuineness
        const [gScore, isoScore] = await Promise.all([
          scoreGenuineness({
            title: autoTitle,
            description: finalDescription,
            category: finalCategory,
            location,
            hostelBlock: hostelBlock || '',
            imageCount: imagePaths.length,
            locationType: locationType || '',
          }),
          detectSpamAnomaly({
            title: autoTitle,
            description: finalDescription,
            imageCount: imagePaths.length,
          }),
        ]);
        const ensembleScore   = Math.round(gScore.score * 0.40 + isoScore.score * 0.60);
        const ensembleVerdict = ensembleScore >= 70 ? 'genuine' : ensembleScore >= 45 ? 'review' : 'suspicious';
        aiUpdates.genuinenessScore   = ensembleScore;
        aiUpdates.genuinenessVerdict = ensembleVerdict;
        aiUpdates.genuinenessFlags   = [...new Set([...gScore.flags, ...isoScore.flags])];

        // Feature #5: Resolution time prediction
        const eta = await predictResolutionTime(finalCategory, finalPriority, location);
        aiUpdates.etaHours = eta.estimatedHours;
        aiUpdates.etaConfidence = eta.confidence;
        aiUpdates.etaBasedOn = eta.basedOn;

        // Innovation #E: SLA breach risk prediction
        if (assignmentResult) {
          try {
            const slaRisk = await predictSLABreach({
              category: finalCategory,
              priority: finalPriority,
              workerId: assignmentResult.worker._id,
            });
            aiUpdates.slaBreach = {
              probability: slaRisk.probability,
              willBreach: slaRisk.willBreach,
              riskPercent: slaRisk.riskPercent,
              confidence: slaRisk.confidence,
              predictedAt: new Date(),
            };
            // Escalate immediately if SLA breach is highly likely
            if (slaRisk.willBreach && slaRisk.confidence === 'high') {
              aiUpdates.isEscalated = true;
              aiUpdates.escalationReason = `AI SLA predictor flagged ${slaRisk.riskPercent}% breach risk`;
              aiUpdates.escalatedAt = new Date();
            }
          } catch (_) { /* non-blocking */ }
        }

        await Complaint.findByIdAndUpdate(complaint._id, aiUpdates);

        // Feature #2: Severity escalation (may emit socket events)
        await processSeverityEscalation(
          { ...complaint.toObject(), ...aiUpdates },
          io
        );
      } catch (aiErr) {
        console.error('[AI enrichment error]', aiErr.message);
      }
    });

    res.status(201).json({
      success: true,
      message: assignmentResult
        ? `Complaint submitted and auto-assigned to ${assignmentResult.worker.name}!`
        : 'Complaint submitted. Admin will assign a worker shortly.',
      complaint,
      assignedWorker: assignmentResult?.worker || null
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student's own complaints
// @route   GET /api/complaints/my-complaints
const getMyComplaints = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 10, search } = req.query;
    const query = { studentId: req.user._id };

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { complaintId: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let complaints = [];
    let total = 0;

    try {
      [complaints, total] = await Promise.all([
        Complaint.find(query)
          .populate('assignedTo', 'name department')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Complaint.countDocuments(query)
      ]);
    } catch (listErr) {
      // Some legacy datasets may contain invalid assignedTo references that break populate.
      // Fall back to non-populated list so student dashboard remains usable.
      console.warn('[getMyComplaints] populate failed, falling back without populate:', listErr.message);
      [complaints, total] = await Promise.all([
        Complaint.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Complaint.countDocuments(query)
      ]);
    }

    res.status(200).json({
      success: true,
      complaints,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single complaint
// @route   GET /api/complaints/:id
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('studentId', 'name email studentId')
      .populate('assignedTo', 'name email department phone')
      .populate('assignedBy', 'name email')
      .populate('statusHistory.updatedBy', 'name role');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Only allow student to see their own complaints
    if (req.user.role === 'student' && complaint.studentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all categories
// @route   GET /api/complaints/categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, categories });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify resolution (accept/reject) by student
// @route   PUT /api/complaints/:id/verify
const verifyResolution = async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    const io = req.app.get('io');

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be accept or reject' });
    }
    if (action === 'reject' && (!reason || reason.trim().length < 20)) {
      return res.status(400).json({ success: false, message: 'Rejection reason must be at least 20 characters' });
    }

    const complaint = await Complaint.findById(req.params.id)
      .populate('studentId', '_id name')
      .populate('assignedTo', '_id name');

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.studentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your complaint' });
    }
    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ success: false, message: 'Complaint is not in Resolved status' });
    }

    if (action === 'accept') {
      complaint.status = 'Completed';
      complaint.verificationStatus = 'accepted';
      complaint.completedVerifiedAt = new Date();
      complaint.completedAt = new Date();
      complaint.statusHistory.push({ status: 'Completed', updatedBy: req.user._id, timestamp: new Date(), remarks: 'Student accepted the resolution', isAutoUpdate: false });
      await complaint.save();

      // Innovation #A + #E: update RL Q-table and SLA logistic regression
      setImmediate(() => onComplaintResolved({ complaint: complaint.toObject() }).catch(() => {}));

      if (complaint.assignedTo) {
        await createNotification(complaint.assignedTo._id, 'status_changed', 'Resolution Accepted ✅',
          `Student accepted your resolution for ${complaint.complaintId}`, complaint._id);
      }
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
      await Promise.all(admins.map(a => createNotification(a._id, 'status_changed', 'Complaint Completed',
        `Complaint ${complaint.complaintId} has been verified and completed by student`, complaint._id)));

      if (io) {
        io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, newStatus: 'Completed' });
        if (complaint.assignedTo) io.to(ROOMS.WORKER(complaint.assignedTo._id)).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, newStatus: 'Completed' });
      }
    } else {
      // Boost priority on rejection
      let newPriority = complaint.priority;
      let shouldEscalate = false;
      if (complaint.priority === 'Low') newPriority = 'Medium';
      else if (complaint.priority === 'Medium') newPriority = 'High';
      else if (complaint.priority === 'High') shouldEscalate = true;

      complaint.status = 'Assigned';
      complaint.verificationStatus = 'rejected';
      complaint.verificationRejectionReason = reason;
      complaint.priority = newPriority;
      if (shouldEscalate) {
        complaint.isEscalated = true;
        complaint.escalatedAt = new Date();
        complaint.escalationReason = 'Resolution rejected by student multiple times';
        complaint.escalationLevel = (complaint.escalationLevel || 0) + 1;
      }
      complaint.statusHistory.push({ status: 'Assigned', updatedBy: req.user._id, timestamp: new Date(), remarks: `Resolution rejected by student: ${reason}. Priority boosted to ${newPriority}`, isAutoUpdate: false });
      await complaint.save();

      const notifPromises = [];
      if (complaint.assignedTo) {
        notifPromises.push(createNotification(complaint.assignedTo._id, 'complaint_rejected', 'Resolution Rejected ❌',
          `Student rejected your resolution for ${complaint.complaintId}. Reason: ${reason}`, complaint._id));
      }
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
      admins.forEach(a => notifPromises.push(createNotification(a._id, 'complaint_rejected', 'Resolution Rejected',
        `Student rejected resolution for ${complaint.complaintId}. Reason: ${reason}`, complaint._id)));
      await Promise.all(notifPromises);

      if (io) {
        io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.STATUS_CHANGED, { complaintId: complaint._id, newStatus: 'Assigned', rejectionReason: reason });
        if (complaint.assignedTo) io.to(ROOMS.WORKER(complaint.assignedTo._id)).emit(SOCKET_EVENTS.COMPLAINT_REJECTED, { complaintId: complaint._id, reason });
      }
    }

    res.status(200).json({ success: true, message: action === 'accept' ? 'Resolution accepted!' : 'Resolution rejected. Complaint reopened.', complaint });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit feedback/rating after completion
// @route   POST /api/complaints/:id/feedback
const submitFeedback = async (req, res, next) => {
  try {
    const { overallRating, responseTimeRating, qualityRating, comments } = req.body;

    if (!overallRating || !responseTimeRating || !qualityRating) {
      return res.status(400).json({ success: false, message: 'All three ratings are required' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your complaint' });
    }
    if (complaint.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Can only rate completed complaints' });
    }

    const existing = await Feedback.findOne({ complaintId: complaint._id });
    if (existing) return res.status(400).json({ success: false, message: 'Feedback already submitted' });

    const feedback = await Feedback.create({
      complaintId: complaint._id,
      studentId: req.user._id,
      workerId: complaint.assignedTo,
      overallRating: parseInt(overallRating),
      responseTimeRating: parseInt(responseTimeRating),
      qualityRating: parseInt(qualityRating),
      comments: comments || ''
    });

    res.status(201).json({ success: true, message: 'Feedback submitted!', feedback });
  } catch (err) {
    next(err);
  }
};

// @desc    Get feedback for a complaint
// @route   GET /api/complaints/:id/feedback
const getFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findOne({ complaintId: req.params.id })
      .populate('studentId', 'name')
      .populate('workerId', 'name department');
    res.status(200).json({ success: true, feedback });
  } catch (err) {
    next(err);
  }
};

module.exports = { createComplaint, getMyComplaints, getComplaintById, getCategories, verifyResolution, submitFeedback, getFeedback };

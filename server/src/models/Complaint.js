const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Electrical', 'Plumbing', 'Furniture', 'Cleanliness', 'AC/Ventilation', 'Internet/WiFi', 'Infrastructure', 'Security', 'Other']
  },
  subcategory: String,
  title: {
    type: String,
    required: true,
    maxlength: 150
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  images: [String],
  videos: { type: [String], default: [] },
  hostelBlock: String,
  roomNumber: String,
  locationType: { type: String, default: '' },
  buildingName: { type: String, default: '' },
  floorNumber:  { type: String, default: '' },
  gender:       { type: String, default: '' },
  section:      { type: String, default: '' },
  landmark:     { type: String, default: '' },
  customLocation: { type: String, default: '' },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Submitted', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Completed', 'Rejected'],
    default: 'Submitted'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isAutoAssigned: {
    type: Boolean,
    default: false
  },
  autoAssignmentReason: String,
  assignedAt: Date,
  aiAnalysis: {
    suggestedCategory: String,
    finalCategory: String,
    confidence: { type: Number, min: 0, max: 1 },
    detectedObjects: [{
      name: String,
      confidence: Number
    }],
    detectedLabels: [{
      label: String,
      confidence: Number
    }],
    method: {
      type: String,
      enum: ['tensorflow', 'google_vision', 'hybrid', 'keyword_fallback']
    },
    isSafeContent: { type: Boolean, default: true },
    studentOverrode: { type: Boolean, default: false },
    analyzedAt: Date
  },
  resolutionRemarks: String,
  resolutionImages: [String],
  completedAt: Date,
  statusHistory: [{
    status: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    remarks: String,
    isAutoUpdate: { type: Boolean, default: false },
    proofImages: [String]
  }],
  rejectionReason: String,
  // SLA
  slaDeadline: Date,
  slaHours: { type: Number, default: 24 },
  // Resolution verification
  verificationStatus: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  verificationRejectionReason: String,
  completedVerifiedAt: Date,
  // Escalation
  isEscalated: { type: Boolean, default: false },
  escalatedAt: Date,
  escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  escalationReason: String,
  escalationLevel: { type: Number, default: 0 },
  // Soft delete
  isActive: { type: Boolean, default: true },

  // ── AI Features ──
  duplicateCount:    { type: Number, default: 0 },       // #1 duplicate merge tally
  mergedFrom:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }],
  severityLevel:     { type: String, enum: ['normal', 'high', 'critical'], default: 'normal' }, // #2
  severitySignals:   [String],                           // #2 detected keywords
  genuinenessScore:  { type: Number, min: 0, max: 100 }, // #16 (IForest ensemble)
  genuinenessVerdict:{ type: String, enum: ['genuine', 'review', 'suspicious'] },
  genuinenessFlags:  [String],
  etaHours:          Number,                             // #5 predicted resolution time
  etaConfidence:     Number,
  etaBasedOn:        String,
  aiDraftUpdate:     String,                             // #9 last AI draft

  // ── Innovation #A: RL Assignment ──
  rlState:   { type: String, default: null },            // Q-Learning state key
  rlAction:  { type: String, default: null },            // workerId chosen by RL agent

  // ── Innovation #E: SLA Breach Prediction ──
  slaBreach: {
    probability:  Number,   // 0–1 P(breach)
    willBreach:   Boolean,
    riskPercent:  Number,   // 0–100
    confidence:   String,   // 'high'|'medium'|'low'
    predictedAt:  Date,
  },
}, { timestamps: true });

// Auto-generate complaintId: CMP-YYYY-NNNN
complaintSchema.pre('save', async function (next) {
  if (this.isNew && !this.complaintId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Complaint').countDocuments();
    this.complaintId = `CMP-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Indexes
complaintSchema.index({ studentId: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ category: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);

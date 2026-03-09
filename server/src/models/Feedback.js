const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true,
    unique: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  overallRating: { type: Number, min: 1, max: 5, required: true },
  responseTimeRating: { type: Number, min: 1, max: 5, required: true },
  qualityRating: { type: Number, min: 1, max: 5, required: true },
  comments: { type: String, maxlength: 500, default: '' }
}, { timestamps: true });

feedbackSchema.index({ workerId: 1 });
feedbackSchema.index({ studentId: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);

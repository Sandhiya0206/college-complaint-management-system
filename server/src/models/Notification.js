const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['complaint_created', 'complaint_assigned', 'status_changed', 'complaint_resolved', 'complaint_rejected', 'complaint_escalated', 'complaint_completed'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);

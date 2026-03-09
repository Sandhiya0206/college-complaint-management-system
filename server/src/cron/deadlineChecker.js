const cron = require('node-cron');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { createNotification } = require('../services/notification.service');

/**
 * Runs every hour – warns workers when their deadline is approaching (< 2 hours away).
 */
const startDeadlineChecker = (io) => {
  cron.schedule('0 * * * *', async () => {
    try {
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const now = new Date();

      // Find complaints approaching deadline (not yet warned)
      const complaints = await Complaint.find({
        isActive: true,
        assignedTo: { $ne: null },
        status: { $nin: ['Resolved', 'Completed', 'Rejected'] },
        slaDeadline: { $lte: twoHoursFromNow, $gt: now }
      }).populate('assignedTo', '_id name');

      for (const complaint of complaints) {
        await createNotification(
          complaint.assignedTo._id,
          'status_changed',
          `⏰ Deadline Warning: ${complaint.complaintId}`,
          `Your complaint ${complaint.complaintId} is due in less than 2 hours!`,
          complaint._id
        );
        if (io) {
          const { ROOMS, SOCKET_EVENTS } = require('../utils/socketEvents');
          io.to(ROOMS.WORKER(complaint.assignedTo._id)).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
            type: 'deadline_warning',
            message: `Deadline approaching for ${complaint.complaintId}`,
            complaintId: complaint._id
          });
        }
      }

      // Warn about overdue complaints
      const overdue = await Complaint.find({
        isActive: true,
        assignedTo: { $ne: null },
        status: { $nin: ['Resolved', 'Completed', 'Rejected'] },
        slaDeadline: { $lt: now }
      }).populate('assignedTo', '_id name');

      for (const complaint of overdue) {
        await createNotification(
          complaint.assignedTo._id,
          'status_changed',
          `🚨 Overdue: ${complaint.complaintId}`,
          `Complaint ${complaint.complaintId} is OVERDUE! Please resolve immediately.`,
          complaint._id
        );
      }

      if (complaints.length > 0 || overdue.length > 0) {
        console.log(`[Cron/Deadline] Warned about ${complaints.length} approaching + ${overdue.length} overdue`);
      }
    } catch (err) {
      console.error('[Cron/Deadline] Error:', err.message);
    }
  });

  console.log('[Cron] Deadline checker started (every hour)');
};

module.exports = { startDeadlineChecker };

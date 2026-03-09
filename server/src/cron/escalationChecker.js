const cron = require('node-cron');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { createNotification } = require('../services/notification.service');

/**
 * Runs every hour – auto-escalates complaints overdue by 24+ hours.
 */
const startEscalationChecker = (io) => {
  cron.schedule('30 * * * *', async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now = new Date();

      const complaints = await Complaint.find({
        isActive: true,
        isEscalated: false,
        status: { $nin: ['Resolved', 'Completed', 'Rejected'] },
        slaDeadline: { $lt: twentyFourHoursAgo }
      });

      for (const complaint of complaints) {
        const overdueHours = Math.round((now - complaint.slaDeadline) / (1000 * 60 * 60));
        complaint.isEscalated = true;
        complaint.escalatedAt = now;
        complaint.escalationReason = `Auto-escalated: overdue by ${overdueHours} hours`;
        complaint.escalationLevel = (complaint.escalationLevel || 0) + 1;
        complaint.statusHistory.push({
          status: complaint.status,
          updatedBy: null,
          timestamp: now,
          remarks: `Auto-escalated by system: overdue by ${overdueHours} hours`,
          isAutoUpdate: true
        });
        await complaint.save();

        // Notify all admins
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        await Promise.all(admins.map(admin =>
          createNotification(
            admin._id,
            'complaint_escalated',
            `⚠️ Auto-Escalated: ${complaint.complaintId}`,
            `Complaint ${complaint.complaintId} has been auto-escalated (overdue by ${overdueHours}h)`,
            complaint._id
          )
        ));

        if (io) {
          const { ROOMS, SOCKET_EVENTS } = require('../utils/socketEvents');
          io.to(ROOMS.ADMIN).emit(SOCKET_EVENTS.STATUS_CHANGED, {
            complaintId: complaint._id,
            isEscalated: true,
            escalationReason: complaint.escalationReason
          });
        }
      }

      if (complaints.length > 0) {
        console.log(`[Cron/Escalation] Auto-escalated ${complaints.length} complaints`);
      }
    } catch (err) {
      console.error('[Cron/Escalation] Error:', err.message);
    }
  });

  console.log('[Cron] Escalation checker started (every hour at :30)');
};

module.exports = { startEscalationChecker };

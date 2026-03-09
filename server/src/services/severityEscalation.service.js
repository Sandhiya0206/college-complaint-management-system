/**
 * Severity & Safety Escalation Service — Feature #2
 * Real-time scan of complaint text for safety-critical signals.
 * Auto-escalates and notifies admins immediately.
 */
const Complaint = require('../models/Complaint');
const { createNotification } = require('./notification.service');
const User = require('../models/User');

// ── Safety keyword tiers ──────────────────────────────────────────────────────
const CRITICAL_PATTERNS = [
  /gas\s*leak/i, /electric(al)?\s*(shock|spark|fire|hazard)/i,
  /short\s*circuit/i, /structural\s*(crack|collapse|fail)/i,
  /ceiling\s*(crack|fall|collaps)/i, /flood(ing)?/i,
  /sewage\s*(overflow|burst|spill)/i, /fire\s*(hazard|outbreak|alarm)/i,
  /rooftop\s*crack/i, /electrocut/i, /burst\s*pipe/i, /wall\s*collaps/i,
  /urgent/i, /emergency/i, /danger(ous)?/i, /immediately/i,
];

const HIGH_PATTERNS = [
  /leak(ing)?/i, /broken\s*(glass|window|door)/i, /no\s*(water|power|electricity)/i,
  /pest\s*infest/i, /rat(s)?/i, /cockroach/i, /mold/i, /raw\s*sewage/i,
  /blocked\s*(drain|toilet)/i, /fan\s*(not\s*work|fall|broke)/i,
  /wire\s*expos/i, /spark(s)?/i, /smoke/i,
];

/**
 * analyseSeverity
 * ───────────────
 * Returns { level: 'critical'|'high'|'normal', signals: string[], autoEscalate: boolean }
 */
const analyseSeverity = (text = '') => {
  const signals = [];

  for (const pattern of CRITICAL_PATTERNS) {
    const m = text.match(pattern);
    if (m) signals.push(m[0]);
  }
  if (signals.length > 0) {
    return { level: 'critical', signals: [...new Set(signals)], autoEscalate: true };
  }

  const highSignals = [];
  for (const pattern of HIGH_PATTERNS) {
    const m = text.match(pattern);
    if (m) highSignals.push(m[0]);
  }
  if (highSignals.length > 0) {
    return { level: 'high', signals: [...new Set(highSignals)], autoEscalate: false };
  }

  return { level: 'normal', signals: [], autoEscalate: false };
};

/**
 * processSeverityEscalation
 * ─────────────────────────
 * Called after a complaint is created. If critical, auto-escalates and pings admins.
 */
const processSeverityEscalation = async (complaint, io) => {
  const combinedText = `${complaint.title} ${complaint.description}`;
  const result = analyseSeverity(combinedText);

  if (!result.autoEscalate) return result;

  try {
    // Force High priority + escalate
    await Complaint.findByIdAndUpdate(complaint._id, {
      priority: 'High',
      isEscalated: true,
      escalatedAt: new Date(),
      escalatedBy: null,
      escalationReason: `⚠️ AI Safety Alert: Detected critical signals — "${result.signals.join('", "')}"`,
      escalationLevel: 2,
      $push: {
        statusHistory: {
          status: complaint.status,
          updatedBy: null,
          timestamp: new Date(),
          remarks: `AUTO-ESCALATED by Safety AI: Critical keywords detected: ${result.signals.join(', ')}`,
          isAutoUpdate: true,
        }
      }
    });

    // Notify all active admins
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
    await Promise.all(admins.map(admin =>
      createNotification(
        admin._id,
        'complaint_escalated',
        '🚨 Safety Alert — Complaint Auto-Escalated',
        `${complaint.complaintId}: Critical issue detected at ${complaint.location}. Keywords: ${result.signals.join(', ')}`,
        complaint._id
      )
    ));

    // Real-time socket push
    if (io) {
      io.to('admin_room').emit('safety_alert', {
        complaintId: complaint.complaintId,
        location: complaint.location,
        signals: result.signals,
        message: 'Critical complaint auto-escalated',
      });
    }
  } catch (err) {
    console.error('Severity escalation error:', err);
  }

  return result;
};

module.exports = { analyseSeverity, processSeverityEscalation };

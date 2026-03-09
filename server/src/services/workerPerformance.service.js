/**
 * Worker Performance & Anomaly Detection — Feature #6
 * Scores workers, detects anomalies, surfaces insights to admin.
 */
const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');

/**
 * computeWorkerScore
 * ──────────────────
 * Returns a 0–100 score for a worker based on:
 * • SLA breach rate (30pts)
 * • Average feedback rating (30pts)
 * • Resolution rate (25pts)
 * • Re-open rate (15pts)
 */
const computeWorkerScore = async (workerId, days = 30) => {
  const since = new Date(Date.now() - days * 86400000);

  const [complaints, feedbacks] = await Promise.all([
    Complaint.find({
      assignedTo: workerId,
      assignedAt: { $gte: since },
    }).select('status slaDeadline completedAt verificationStatus').lean(),

    Feedback.find({ workerId, createdAt: { $gte: since } })
      .select('overallRating').lean(),
  ]);

  if (complaints.length === 0) return { score: null, details: null, complaints: 0 };

  const total = complaints.length;
  const resolved = complaints.filter(c => ['Resolved', 'Completed'].includes(c.status));
  const resolutionRate = resolved.length / total;

  // SLA breach rate
  const withDeadline = complaints.filter(c => c.slaDeadline);
  const breached = withDeadline.filter(c => {
    const deadline = new Date(c.slaDeadline);
    const completedAt = c.completedAt ? new Date(c.completedAt) : new Date();
    return completedAt > deadline;
  });
  const slaBreachRate = withDeadline.length > 0 ? breached.length / withDeadline.length : 0;

  // Feedback
  const avgRating = feedbacks.length > 0
    ? feedbacks.reduce((s, f) => s + f.overallRating, 0) / feedbacks.length
    : null;

  // Re-open (rejected verification)
  const reopened = complaints.filter(c => c.verificationStatus === 'rejected').length;
  const reopenRate = resolved.length > 0 ? reopened / resolved.length : 0;

  // Compose score
  const slaScore    = Math.round((1 - slaBreachRate) * 30);
  const ratingScore = avgRating !== null ? Math.round((avgRating / 5) * 30) : 15;
  const resolveScore = Math.round(resolutionRate * 25);
  const reopenScore  = Math.round((1 - reopenRate) * 15);
  const total_score  = slaScore + ratingScore + resolveScore + reopenScore;

  return {
    score: total_score,
    grade: total_score >= 80 ? 'A' : total_score >= 65 ? 'B' : total_score >= 50 ? 'C' : 'D',
    details: {
      slaBreachRate: Math.round(slaBreachRate * 100),
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      resolutionRate: Math.round(resolutionRate * 100),
      reopenRate: Math.round(reopenRate * 100),
      slaScore, ratingScore, resolveScore, reopenScore,
    },
    complaints: total,
    feedbackCount: feedbacks.length,
  };
};

/**
 * detectWorkerAnomalies
 * ─────────────────────
 * Returns workers whose performance has degraded significantly in the last 7 days
 * vs the previous 23 days.
 */
const detectWorkerAnomalies = async (workerIds) => {
  const anomalies = [];

  for (const wid of workerIds) {
    const recent  = await computeWorkerScore(wid, 7);
    const baseline = await computeWorkerScore(wid, 30);

    if (!recent.score || !baseline.score || recent.complaints < 3) continue;

    const drop = baseline.score - recent.score;
    if (drop >= 20) {
      anomalies.push({
        workerId: wid,
        recentScore: recent.score,
        baselineScore: baseline.score,
        drop,
        severity: drop >= 35 ? 'critical' : 'warning',
        details: recent.details,
      });
    }
  }

  return anomalies;
};

/**
 * getAllWorkerPerformance
 * ──────────────────────
 * Returns performance data for all workers, for the admin dashboard.
 */
const getAllWorkerPerformance = async (workerList) => {
  return Promise.all(
    workerList.map(async (w) => {
      const perf = await computeWorkerScore(w._id, 30);
      return { worker: w, ...perf };
    })
  );
};

module.exports = { computeWorkerScore, detectWorkerAnomalies, getAllWorkerPerformance };

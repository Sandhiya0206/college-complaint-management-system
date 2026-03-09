/**
 * Resolution Time Predictor — Feature #5
 * Estimates how long a complaint will take to resolve based on historical data.
 */
const Complaint = require('../models/Complaint');

const DEFAULT_ESTIMATES = {
  Electrical: 4, Plumbing: 5, Furniture: 6, Cleanliness: 2,
  'AC/Ventilation': 8, 'Internet/WiFi': 3, Infrastructure: 24, Security: 2, Other: 8,
};

const PRIORITY_MULTIPLIER = { High: 0.6, Medium: 1.0, Low: 1.5 };

/**
 * predictResolutionTime
 * ─────────────────────
 * Returns { estimatedHours, confidence, basedOn, label }
 */
const predictResolutionTime = async (category, priority = 'Medium', location = '') => {
  try {
    // Try to get average from last 60 days of resolved complaints in this category
    const since = new Date(Date.now() - 60 * 86400000);
    const resolved = await Complaint.find({
      category,
      status: { $in: ['Resolved', 'Completed'] },
      priority,
      completedAt: { $gte: since },
      assignedAt: { $exists: true },
    }).select('assignedAt completedAt').lean().limit(50);

    let estimatedHours;
    let confidence;
    let basedOn;

    if (resolved.length >= 5) {
      const durations = resolved
        .map(c => (new Date(c.completedAt) - new Date(c.assignedAt)) / 3600000)
        .filter(h => h > 0 && h < 168); // ignore outliers > 1 week

      if (durations.length >= 3) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        estimatedHours = Math.round(avg * 10) / 10;
        confidence = Math.min(95, 60 + durations.length * 2);
        basedOn = `${durations.length} similar complaints`;
      }
    }

    if (!estimatedHours) {
      const base = DEFAULT_ESTIMATES[category] || 8;
      estimatedHours = Math.round(base * (PRIORITY_MULTIPLIER[priority] || 1) * 10) / 10;
      confidence = 40;
      basedOn = 'category average';
    }

    // Format label
    let label;
    if (estimatedHours < 1) label = `~${Math.round(estimatedHours * 60)} minutes`;
    else if (estimatedHours < 24) label = `~${estimatedHours} hours`;
    else label = `~${Math.round(estimatedHours / 24)} days`;

    return { estimatedHours, confidence, basedOn, label };
  } catch (err) {
    console.error('Resolution predictor error:', err);
    const base = DEFAULT_ESTIMATES[category] || 8;
    return { estimatedHours: base, confidence: 30, basedOn: 'default', label: `~${base} hours` };
  }
};

/**
 * getWorkerAvgResolutionTime
 * ──────────────────────────
 * Returns a worker's average resolution time per category.
 */
const getWorkerAvgResolutionTime = async (workerId, category = null) => {
  const since = new Date(Date.now() - 90 * 86400000);
  const matchStage = {
    assignedTo: workerId,
    status: { $in: ['Resolved', 'Completed'] },
    completedAt: { $gte: since },
    assignedAt: { $exists: true },
  };
  if (category) matchStage.category = category;

  const results = await Complaint.aggregate([
    { $match: matchStage },
    {
      $project: {
        category: 1,
        durationHours: { $divide: [{ $subtract: ['$completedAt', '$assignedAt'] }, 3600000] }
      }
    },
    { $match: { durationHours: { $gt: 0, $lt: 168 } } },
    { $group: { _id: '$category', avgHours: { $avg: '$durationHours' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  if (category) {
    const hit = results.find(r => r._id === category);
    return hit ? hit.avgHours : null;
  }
  return results; // Returns array when no category filter
};

module.exports = { predictResolutionTime, getWorkerAvgResolutionTime };

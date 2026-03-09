/**
 * Predictive Analytics Service — Feature #3
 * Pattern analysis: failure prediction, hotspot detection, seasonal forecasting.
 */
const Complaint = require('../models/Complaint');

const MS_PER_DAY = 86400000;

/**
 * getHotspots
 * ───────────
 * Returns locations + categories with the most unresolved complaints.
 */
const getHotspots = async (limit = 10) => {
  return Complaint.aggregate([
    { $match: { status: { $nin: ['Resolved', 'Completed', 'Rejected'] }, isActive: { $ne: false } } },
    { $group: { _id: { location: '$location', category: '$category' }, count: { $sum: 1 }, avgPriority: { $avg: { $cond: [{ $eq: ['$priority', 'High'] }, 3, { $cond: [{ $eq: ['$priority', 'Medium'] }, 2, 1] }] } } } },
    { $sort: { count: -1, avgPriority: -1 } },
    { $limit: limit },
    { $project: { location: '$_id.location', category: '$_id.category', count: 1, avgPriority: 1, _id: 0 } },
  ]);
};

/**
 * getRepeatLocations
 * ──────────────────
 * Feature #14: Locations with 3+ resolved complaints of the same category
 * (needs permanent fix, not patch).
 */
const getRepeatLocations = async (minCount = 3) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * MS_PER_DAY);
  return Complaint.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo }, isActive: true } },
    {
      $group: {
        _id: { location: '$location', category: '$category' },
        totalCount: { $sum: 1 },
        resolvedCount: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ['$status', 'Resolved'] }, { $eq: ['$status', 'Completed'] }] },
              1, 0
            ]
          }
        },
        openCount: {
          $sum: {
            $cond: [
              { $and: [
                { $ne: ['$status', 'Resolved'] },
                { $ne: ['$status', 'Completed'] },
                { $ne: ['$status', 'Rejected'] }
              ]},
              1, 0
            ]
          }
        }
      }
    },
    { $match: { totalCount: { $gte: minCount } } },
    { $sort: { totalCount: -1 } },
    { $limit: 20 },
    { $project: { location: '$_id.location', category: '$_id.category', totalCount: 1, resolvedCount: 1, openCount: 1, _id: 0 } },
  ]);
};

/**
 * getDailyTrend
 * ─────────────
 * Returns complaint count per day for the last N days.
 */
const getDailyTrend = async (days = 14) => {
  const since = new Date(Date.now() - days * MS_PER_DAY);
  return Complaint.aggregate([
    { $match: { createdAt: { $gte: since }, isActive: true } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
};

/**
 * getCategoryTrend  
 * ─────────────────
 * Per-category counts for the last N days to detect spikes.
 */
const getCategoryTrend = async (days = 7) => {
  const since = new Date(Date.now() - days * MS_PER_DAY);
  return Complaint.aggregate([
    { $match: { createdAt: { $gte: since }, isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 }, highCount: { $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] } } } },
    { $sort: { count: -1 } },
  ]);
};

/**
 * predictNextWeekVolume
 * ─────────────────────
 * Simple linear regression on the last 30 days to forecast next 7 days.
 * Returns { forecast: number, trend: 'up'|'down'|'stable', confidence: number }
 */
const predictNextWeekVolume = async () => {
  const trend = await getDailyTrend(30);
  if (trend.length < 7) return { forecast: 0, trend: 'stable', confidence: 0 };

  const values = trend.map(d => d.count);
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;

  // Linear regression slope
  const xMean = (n - 1) / 2;
  const num = values.reduce((sum, y, x) => sum + (x - xMean) * (y - mean), 0);
  const den = values.reduce((sum, _, x) => sum + (x - xMean) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;

  const nextWeek = Math.max(0, Math.round((mean + slope * (n + 3)) * 7));
  const lastWeek = values.slice(-7).reduce((a, b) => a + b, 0);

  const trendDir = slope > 0.3 ? 'up' : slope < -0.3 ? 'down' : 'stable';
  const r2 = Math.min(0.95, Math.abs(slope) / (mean || 1) * 2);

  return { forecast: nextWeek, lastWeek, trend: trendDir, confidence: Math.round(r2 * 100), slope: Math.round(slope * 100) / 100 };
};

/**
 * getMaintenanceSuggestions
 * ─────────────────────────
 * Returns actionable suggestions for preventive maintenance based on repeat locations.
 */
const getMaintenanceSuggestions = async () => {
  const repeats = await getRepeatLocations(3);
  return repeats.map(r => ({
    location: r.location,
    category: r.category,
    totalComplaints: r.totalCount,
    suggestion: `Schedule preventive maintenance for ${r.category} at "${r.location}" — ${r.totalCount} complaints in 30 days`,
    urgency: r.openCount > 0 ? 'high' : 'medium',
  }));
};

module.exports = {
  getHotspots,
  getRepeatLocations,
  getDailyTrend,
  getCategoryTrend,
  predictNextWeekVolume,
  getMaintenanceSuggestions,
};

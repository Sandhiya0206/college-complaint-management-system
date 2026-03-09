const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { getWorkerAvgResolutionTime } = require('./resolutionPredictor.service');

const DEPARTMENT_MAP = {
  'Electrical': 'Electrical',
  'Plumbing': 'Plumbing',
  'Furniture': 'Furniture',
  'Cleanliness': 'Cleanliness',
  'AC/Ventilation': 'AC/Ventilation',
  'Internet/WiFi': 'Internet/WiFi',
  'Infrastructure': 'Infrastructure',
  'Security': 'Security',
  'Other': null
};

const findBestWorkerForCategory = async (category) => {
  try {
    const department = DEPARTMENT_MAP[category] || null;

    // Find active workers in the matching department
    let workers = await User.find({
      role: 'worker',
      isActive: true,
      ...(department && { department })
    }).lean();

    // Fallback: any active worker if no department match
    if (workers.length === 0 && department) {
      workers = await User.find({ role: 'worker', isActive: true }).lean();
    }

    if (workers.length === 0) return null;

    // Count active complaints per worker (not resolved/rejected)
    const workerIds = workers.map(w => w._id);
    const workloadCounts = await Complaint.aggregate([
      {
        $match: {
          assignedTo: { $in: workerIds },
          status: { $nin: ['Resolved', 'Rejected'] }
        }
      },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);

    const workloadMap = {};
    workloadCounts.forEach(({ _id, count }) => {
      workloadMap[_id.toString()] = count;
    });

    // Feature #4: Dynamic load balancing — score each worker
    const SLA_HOURS = 24;
    const workerScores = await Promise.all(workers.map(async (w) => {
      const activeLoad = workloadMap[w._id.toString()] || 0;
      // Penalise by load (each active complaint = 5 pts penalty, max 50)
      const loadPenalty = Math.min(activeLoad * 5, 50);
      // Bonus for faster historical resolution in this category
      let speedBonus = 0;
      try {
        const avgHrs = await getWorkerAvgResolutionTime(w._id, category);
        if (avgHrs !== null && avgHrs < SLA_HOURS * 0.7) speedBonus = 20;
        else if (avgHrs !== null && avgHrs < SLA_HOURS) speedBonus = 10;
      } catch (_) { /* ignore */ }
      return { worker: w, activeLoad, score: 100 - loadPenalty + speedBonus };
    }));

    // Sort by score descending
    workerScores.sort((a, b) => b.score - a.score);
    const best = workerScores[0];
    const bestWorker = best.worker;
    const activeLoad = best.activeLoad;

    return {
      worker: bestWorker,
      activeComplaintCount: activeLoad,
      reason: department
        ? `AI detected ${category} issue, assigned to ${bestWorker.name} (${department} dept, ${activeLoad} active complaints)`
        : `No specialist found for ${category}, assigned to ${bestWorker.name} with lowest workload (${activeLoad} active complaints)`
    };
  } catch (err) {
    console.error('Auto-assignment error:', err);
    return null;
  }
};

module.exports = { findBestWorkerForCategory };

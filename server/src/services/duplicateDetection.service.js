/**
 * AI Duplicate & Near-Duplicate Detection Service
 * Feature #1: Scan for similar complaints before submission
 */
const Complaint = require('../models/Complaint');

// Compute simple word-overlap similarity score (0-1) between two strings
const textSimilarity = (a = '', b = '') => {
  if (!a || !b) return 0;
  const tokenize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

// Normalise a location string for comparison
const normalizeLocation = (loc = '') => loc.toLowerCase().trim().replace(/\s+/g, ' ');

/**
 * findSimilarComplaints
 * ─────────────────────
 * Returns up to 5 active complaints that are likely duplicates of the incoming one.
 * Scoring:
 *  • same category        → +0.40
 *  • location overlap     → +0.30 * sim
 *  • description overlap  → +0.30 * sim
 * Threshold for "similar": score ≥ 0.45
 */
const findSimilarComplaints = async ({ category, location = '', description = '', hostelBlock = '' }) => {
  try {
    // Only scan open complaints created in the last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const candidates = await Complaint.find({
      status: { $nin: ['Resolved', 'Completed', 'Rejected'] },
      isActive: true,
      createdAt: { $gte: since },
    })
      .select('complaintId title category location description hostelBlock status priority createdAt')
      .lean()
      .limit(200);

    const scored = candidates
      .map(c => {
        let score = 0;
        if (c.category === category) score += 0.40;
        score += 0.30 * textSimilarity(normalizeLocation(c.location), normalizeLocation(location));
        score += 0.30 * textSimilarity(c.description, description);
        // Boost if same hostel block
        if (hostelBlock && c.hostelBlock === hostelBlock) score = Math.min(1, score + 0.10);
        return { ...c, similarityScore: Math.round(score * 100) };
      })
      .filter(c => c.similarityScore >= 45)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);

    return scored;
  } catch (err) {
    console.error('Duplicate detection error:', err);
    return [];
  }
};

/**
 * mergeDuplicateGroup
 * ───────────────────
 * When a duplicate is confirmed, boost priority of the original complaint and
 * record the merge in statusHistory.
 */
const mergeDuplicateGroup = async (originalId, newStudentId) => {
  try {
    const complaint = await Complaint.findById(originalId);
    if (!complaint) return null;

    // Escalate priority one level if not already High
    const priorityUp = { Low: 'Medium', Medium: 'High', High: 'High' };
    const newPriority = priorityUp[complaint.priority] || complaint.priority;

    complaint.priority = newPriority;
    complaint.duplicateCount = (complaint.duplicateCount || 0) + 1;
    complaint.statusHistory.push({
      status: complaint.status,
      updatedBy: null,
      timestamp: new Date(),
      remarks: `Merged duplicate complaint. Priority auto-upgraded to ${newPriority}. Total reports: ${complaint.duplicateCount + 1}`,
      isAutoUpdate: true,
    });

    await complaint.save();
    return complaint;
  } catch (err) {
    console.error('Merge duplicate error:', err);
    return null;
  }
};

module.exports = { findSimilarComplaints, mergeDuplicateGroup };

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const { mergeDuplicateGroup } = require('../services/duplicateDetection.service');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint_management';
const SIMILARITY_THRESHOLD = Number(process.env.DEDUPE_SIMILARITY_THRESHOLD || 0.72);
const TITLE_MATCH_THRESHOLD = Number(process.env.DEDUPE_TITLE_MATCH_THRESHOLD || 0.58);
const LOOKBACK_DAYS = Number(process.env.DEDUPE_LOOKBACK_DAYS || 365);
const ID_PREFIX = process.env.DEDUPE_ID_PREFIX || 'CMP-';

const ACTIVE_STATUSES = ['Submitted', 'Assigned', 'In Progress', 'On Hold'];

const normalizeText = (value = '') => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenize = (value = '') => normalizeText(value).split(' ').filter(Boolean);

const jaccardSimilarity = (a = '', b = '') => {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

const complaintTextBlob = (complaint) => `${normalizeText(complaint.title)} ${normalizeText(complaint.description)}`.trim();

const groupKey = (complaint) => `${complaint.category}`;

const toIso = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toISOString();
  } catch (_) {
    return String(value);
  }
};

const planMerges = (complaints = []) => {
  const grouped = new Map();
  complaints.forEach((complaint) => {
    const key = groupKey(complaint);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(complaint);
  });

  const plans = [];

  grouped.forEach((bucket) => {
    if (bucket.length < 2) return;

    const sorted = [...bucket].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const canonicals = [];

    sorted.forEach((candidate) => {
      const candidateBlob = complaintTextBlob(candidate);
      const candidateTitle = normalizeText(candidate.title);

      let bestMatch = null;

      canonicals.forEach((canonical) => {
        const canonicalBlob = complaintTextBlob(canonical);
        const sim = jaccardSimilarity(candidateBlob, canonicalBlob);
        const exactTitleMatch = candidateTitle && candidateTitle === normalizeText(canonical.title);
        const sameWorker = canonical.assignedTo && candidate.assignedTo
          && String(canonical.assignedTo) === String(candidate.assignedTo);
        const sameStudent = canonical.studentId && candidate.studentId
          && String(canonical.studentId) === String(candidate.studentId);
        const sameLocation = normalizeText(canonical.location) === normalizeText(candidate.location);

        const strongStudentDuplicate = sameStudent && (sim >= 0.7 || exactTitleMatch);
        const strongLocationDuplicate = sameLocation && exactTitleMatch && sim >= 0.9;
        const strongWorkerDuplicate = sameWorker && sameLocation && sim >= 0.85;
        const strongTitleDuplicate = exactTitleMatch && sameLocation && sim >= TITLE_MATCH_THRESHOLD;

        if (!strongStudentDuplicate && !strongLocationDuplicate && !strongWorkerDuplicate && !strongTitleDuplicate) return;

        if (!bestMatch || sim > bestMatch.similarity) {
          bestMatch = { canonical, similarity: sim };
        }
      });

      if (bestMatch) {
        plans.push({
          source: candidate,
          target: bestMatch.canonical,
          similarity: bestMatch.similarity
        });
      } else {
        canonicals.push(candidate);
      }
    });
  });

  return plans;
};

const printPlan = (plans = []) => {
  if (plans.length === 0) {
    console.log('No duplicate merges planned.');
    return;
  }

  console.log(`Planned merges: ${plans.length}`);
  plans.slice(0, 30).forEach((plan, idx) => {
    console.log(
      `${idx + 1}. ${plan.source.complaintId} -> ${plan.target.complaintId} | ${Math.round(plan.similarity * 100)}% | ${plan.source.category} | ${plan.source.location} | sameStudent=${String(plan.source.studentId) === String(plan.target.studentId)}`
    );
  });

  if (plans.length > 30) {
    console.log(`... and ${plans.length - 30} more`);
  }
};

const applyMerges = async (plans = []) => {
  let mergedCount = 0;
  let skippedCount = 0;

  for (const plan of plans) {
    const sourceId = plan.source._id;
    const targetId = plan.target._id;

    if (String(sourceId) === String(targetId)) {
      skippedCount += 1;
      continue;
    }

    const sourceDoc = await Complaint.findById(sourceId);
    if (!sourceDoc || sourceDoc.isActive === false) {
      skippedCount += 1;
      continue;
    }

    const targetDoc = await mergeDuplicateGroup(targetId, {
      duplicateComplaintId: sourceId,
      reporterStudentId: sourceDoc.studentId
    });

    if (!targetDoc) {
      skippedCount += 1;
      continue;
    }

    sourceDoc.isActive = false;
    if (!['Resolved', 'Completed', 'Rejected'].includes(sourceDoc.status)) {
      sourceDoc.status = 'Rejected';
    }
    sourceDoc.rejectionReason = `Merged into ${targetDoc.complaintId} by duplicate cleanup utility`;
    sourceDoc.statusHistory.push({
      status: sourceDoc.status,
      updatedBy: null,
      timestamp: new Date(),
      remarks: `Merged into ${targetDoc.complaintId} during duplicate cleanup`,
      isAutoUpdate: true
    });

    await sourceDoc.save();
    mergedCount += 1;
  }

  return { mergedCount, skippedCount };
};

const run = async () => {
  const applyMode = process.argv.includes('--apply');

  await mongoose.connect(MONGODB_URI);

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const complaints = await Complaint.find({
    isActive: { $ne: false },
    status: { $in: ACTIVE_STATUSES },
    createdAt: { $gte: since },
    complaintId: { $regex: `^${ID_PREFIX}` }
  })
    .select('_id complaintId studentId assignedTo category title description location status createdAt')
    .lean();

  console.log(`Loaded ${complaints.length} active complaints since ${toIso(since)} with prefix ${ID_PREFIX}.`);

  const plans = planMerges(complaints);
  printPlan(plans);

  if (!applyMode) {
    console.log('Dry run complete. Re-run with --apply to execute merges.');
    await mongoose.disconnect();
    return;
  }

  const { mergedCount, skippedCount } = await applyMerges(plans);
  console.log(`Applied merges: ${mergedCount}, skipped: ${skippedCount}.`);

  await mongoose.disconnect();
};

run()
  .then(() => {
    console.log('Duplicate cleanup finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Duplicate cleanup failed:', err);
    process.exit(1);
  });

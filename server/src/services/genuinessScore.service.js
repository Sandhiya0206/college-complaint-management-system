/**
 * Complaint Genuineness Scorer — Feature #16
 * Analyses a complaint for signs of low effort or suspicious patterns.
 * Returns a score 0-100 (100 = very genuine).
 */

// Suspicious / filler phrases
const FILLER_PHRASES = [
  /^(test|testing|hello|hi|asdf|lorem|xxx|abc|dummy|fake)/i,
  /(.)\1{4,}/i,           // 5+ repeated chars e.g. "aaaaaaa"
  /^\s*\W+\s*$/,          // only punctuation
];

const MIN_MEANINGFUL_WORDS = 4;

/**
 * scoreGenuineness
 * ────────────────
 * Returns { score, flags, verdict }
 * score: 0–100 (higher = more genuine)
 * flags: array of string reasons for deduction
 * verdict: 'genuine' | 'review' | 'suspicious'
 */
const scoreGenuineness = ({
  title = '',
  description = '',
  category = '',
  location = '',
  hostelBlock = '',
  imageCount = 0,
  locationType = '',
}) => {
  let score = 100;
  const flags = [];

  // ── Description checks ──
  const descWords = description.trim().split(/\s+/).filter(Boolean);

  if (descWords.length === 0) {
    score -= 20; flags.push('No description provided');
  } else if (descWords.length < MIN_MEANINGFUL_WORDS) {
    score -= 12; flags.push('Very short description');
  }

  for (const pattern of FILLER_PHRASES) {
    if (pattern.test(description)) {
      score -= 25; flags.push('Filler/test text detected in description');
      break;
    }
  }

  // ── Title checks ──
  if (!title.trim()) {
    score -= 15; flags.push('No title provided');
  } else if (title.trim().split(/\s+/).length < 3) {
    score -= 5; flags.push('Very short title');
  }

  for (const pattern of FILLER_PHRASES) {
    if (pattern.test(title)) {
      score -= 20; flags.push('Filler/test text in title');
      break;
    }
  }

  // ── Location checks ──
  if (!location.trim()) {
    score -= 15; flags.push('No location specified');
  } else if (!locationType) {
    score -= 5; flags.push('Location type not selected');
  }

  // ── Category ──
  if (!category) {
    score -= 10; flags.push('Category not detected');
  }

  // ── Media boost ──
  if (imageCount > 0) {
    score = Math.min(100, score + 10);
  }

  // ── Clamp ──
  score = Math.max(0, Math.min(100, score));

  const verdict =
    score >= 70 ? 'genuine' :
    score >= 45 ? 'review' :
                  'suspicious';

  return { score, flags, verdict };
};

/**
 * getGenuinenessColor
 * ───────────────────
 * Returns Tailwind classes for the badge.
 */
const getGenuinenessColor = (score) => {
  if (score >= 70) return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Genuine' };
  if (score >= 45) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: 'Review' };
  return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Suspicious' };
};

module.exports = { scoreGenuineness, getGenuinenessColor };

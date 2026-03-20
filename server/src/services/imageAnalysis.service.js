// Server-side image analysis service
// Uses Google Vision if enabled, then fuses client AI + YOLOv8 signals, then falls back.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  mapLabelsToCategory,
  calculatePriorityFromCategory,
  mapYoloObjectsToCategory,
  CATEGORY_KEYWORD_MAP
} = require('../utils/categoryMapper');
const { classifyImageWithGroq, hasGroqVisionEnabled } = require('./groqVision.service');

const SIGNAL_WEIGHTS = Object.freeze({
  fine_tuned: 0.5,
  clip: 0.2,
  coco: 0.15,
  yolo: 0.15
});

const CATEGORY_LIST = [...Object.keys(CATEGORY_KEYWORD_MAP), 'Other'];

const CATEGORY_CONFIDENCE_THRESHOLDS = Object.freeze({
  Electrical: 0.58,
  Plumbing: 0.56,
  Furniture: 0.52,
  Cleanliness: 0.5,
  'AC/Ventilation': 0.55,
  'Internet/WiFi': 0.56,
  Infrastructure: 0.57,
  Security: 0.6,
  Other: 0.45
});

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const YOLO_SCRIPT_PATH = process.env.YOLO_SCRIPT_PATH || path.join(PROJECT_ROOT, 'ml', 'yolo_detector.py');
const YOLO_WEIGHTS = process.env.YOLO_WEIGHTS || 'yolov8n.pt';
const YOLO_PYTHON = process.env.YOLO_PYTHON || process.env.PYTHON_BIN || '';
const YOLO_CONFIDENCE = Number(process.env.YOLO_CONFIDENCE || 0.25);
const YOLO_MAX_DETECTIONS = Number(process.env.YOLO_MAX_DETECTIONS || 15);
const YOLO_TIMEOUT_MS = Number(process.env.YOLO_TIMEOUT_MS || 20000);
const HYBRID_TOP_CATEGORIES_LIMIT = Number(process.env.HYBRID_TOP_CATEGORIES_LIMIT || 3);
const HYBRID_UNCERTAIN_MARGIN = Number(process.env.HYBRID_UNCERTAIN_MARGIN || 0.08);
const HYBRID_MIN_CONFIDENCE = Number(process.env.HYBRID_MIN_CONFIDENCE || 0.35);
const YOLO_OVERRIDE_CONFIDENCE = Number(process.env.YOLO_OVERRIDE_CONFIDENCE || 0.78);

const clamp01 = (value, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, num));
};

const cleanText = (value, maxLength = 1000) => {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.slice(0, maxLength);
};

const extractClientTextHints = (clientData = {}) => ({
  suggestedTitle: cleanText(clientData?.title, 150),
  suggestedDescription: cleanText(clientData?.description, 1000)
});

const attachClientTextHints = (analysis, clientData = {}) => {
  if (!analysis || typeof analysis !== 'object') return analysis;
  const hints = extractClientTextHints(clientData);
  return {
    ...analysis,
    suggestedTitle: cleanText(analysis.suggestedTitle || analysis.title, 150) || hints.suggestedTitle,
    suggestedDescription: cleanText(analysis.suggestedDescription || analysis.description, 1000) || hints.suggestedDescription
  };
};

const unique = (items) => [...new Set(items)];

const normalizeCategory = (value) => {
  const category = String(value || '').trim();
  return CATEGORY_LIST.includes(category) ? category : 'Other';
};

const normalizeObjectEntry = (item, defaultSource = 'client') => {
  if (typeof item === 'string') {
    return { name: item, confidence: 0.5, source: defaultSource };
  }

  if (!item || typeof item !== 'object') return null;

  const name = String(item.name || item.label || item.class || '').trim();
  if (!name) return null;

  return {
    name,
    confidence: clamp01(item.confidence ?? item.score ?? item.probability, 0.5),
    source: item.source || defaultSource
  };
};

const toLabelEntries = (objects = []) => objects
  .map((obj) => ({ label: obj.name, confidence: obj.confidence }))
  .filter((obj) => obj.label);

const parseClientObjects = (clientData = {}) => {
  const objects = [];

  if (Array.isArray(clientData.objects)) {
    clientData.objects.forEach((obj) => {
      const parsed = normalizeObjectEntry(obj, 'coco_client');
      if (parsed) objects.push(parsed);
    });
  }

  if (Array.isArray(clientData.detectedObjects)) {
    clientData.detectedObjects.forEach((obj) => {
      const parsed = normalizeObjectEntry(obj, 'client');
      if (parsed) objects.push(parsed);
    });
  }

  return objects;
};

const parseClientPredictions = (clientData = {}) => {
  if (!Array.isArray(clientData.predictions)) return [];
  return clientData.predictions
    .map((pred) => {
      const label = pred?.className || pred?.label || pred?.name || (typeof pred === 'string' ? pred : '');
      return {
        label,
        confidence: clamp01(pred?.probability ?? pred?.confidence ?? pred?.score, 0.5)
      };
    })
    .filter((pred) => pred.label);
};

const parseClientTopCategories = (clientData = {}) => {
  if (!Array.isArray(clientData.topCategories)) return [];

  return clientData.topCategories
    .map((item) => {
      const category = normalizeCategory(item?.category || item?.label);
      const confidence = clamp01(item?.confidence ?? item?.score, 0);
      if (!category || confidence <= 0) return null;
      return { category, confidence };
    })
    .filter(Boolean)
    .slice(0, HYBRID_TOP_CATEGORIES_LIMIT);
};

const getClientPrimarySignal = (clientData = {}) => {
  const category = String(clientData.category || '').trim();
  const confidence = clamp01(clientData.confidence, 0);
  const method = String(clientData.method || '').toLowerCase();

  if (!category || confidence <= 0) return null;

  if (method.includes('finetuned') || method.includes('custom_finetuned')) {
    return { signal: 'fine_tuned', category, confidence };
  }

  if (method.includes('clip')) {
    return { signal: 'clip', category, confidence };
  }

  if (method === 'tensorflow') {
    return { signal: 'fine_tuned', category, confidence };
  }

  return { signal: 'clip', category, confidence };
};

const runYoloProcess = (pythonExecutable, imagePath) => {
  return new Promise((resolve, reject) => {
    const args = [
      YOLO_SCRIPT_PATH,
      '--image', imagePath,
      '--weights', YOLO_WEIGHTS,
      '--conf', String(YOLO_CONFIDENCE),
      '--max-detections', String(YOLO_MAX_DETECTIONS)
    ];

    if (process.env.YOLO_DEVICE) {
      args.push('--device', process.env.YOLO_DEVICE);
    }

    const child = spawn(pythonExecutable, args, {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (handler) => (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handler(value);
    };

    const resolveOnce = finish(resolve);
    const rejectOnce = finish(reject);

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      rejectOnce(new Error(`[YOLO] Timed out after ${YOLO_TIMEOUT_MS} ms`));
    }, YOLO_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('error', (err) => rejectOnce(err));

    child.on('close', (code) => {
      const out = stdout.trim();
      const err = stderr.trim();

      if (code !== 0) {
        return rejectOnce(new Error(`[YOLO] Exit code ${code}: ${err || out || 'Unknown error'}`));
      }

      const lines = out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const rawJson = lines.length > 0 ? lines[lines.length - 1] : out;

      if (!rawJson) {
        return resolveOnce({ detections: [] });
      }

      try {
        const parsed = JSON.parse(rawJson);
        if (parsed?.error) {
          return rejectOnce(new Error(`[YOLO] ${parsed.error}`));
        }
        return resolveOnce(parsed);
      } catch (parseErr) {
        return rejectOnce(new Error(`[YOLO] Invalid JSON output: ${parseErr.message}`));
      }
    });
  });
};

const runYoloDetection = async (imagePath) => {
  if (!imagePath || process.env.YOLO_ENABLED === 'false') return null;
  if (!fs.existsSync(imagePath)) return null;
  if (!fs.existsSync(YOLO_SCRIPT_PATH)) {
    console.warn('[YOLO] Detector script not found:', YOLO_SCRIPT_PATH);
    return null;
  }

  const executableCandidates = unique([
    YOLO_PYTHON,
    process.platform === 'win32' ? 'py' : 'python',
    process.platform === 'win32' ? 'python' : null
  ].filter(Boolean));

  let lastError = null;

  for (const executable of executableCandidates) {
    try {
      return await runYoloProcess(executable, imagePath);
    } catch (err) {
      lastError = err;
      if (err && err.code === 'ENOENT') {
        continue;
      }

      // For runtime/model errors, do not retry with another interpreter.
      throw err;
    }
  }

  throw lastError || new Error('[YOLO] Python executable not found');
};

const buildHybridAnalysis = ({ clientData = {}, yoloDetections = [] }) => {
  const categoryScores = Object.fromEntries(CATEGORY_LIST.map((category) => [category, 0]));
  const signalBreakdown = [];
  const categoryEvidence = Object.fromEntries(CATEGORY_LIST.map((category) => [category, []]));

  const applySignal = (signal, category, confidence, meta = {}) => {
    if (!signal || !SIGNAL_WEIGHTS[signal]) return;
    const normalizedCategory = normalizeCategory(category);
    const normalizedConfidence = clamp01(confidence, 0);
    if (normalizedConfidence <= 0) return;

    const rank = Number(meta.rank || 0);
    const decay = rank <= 0 ? 1 : rank === 1 ? 0.7 : 0.45;
    const scale = clamp01(meta.scale, 1);

    const weight = SIGNAL_WEIGHTS[signal];
    const contribution = normalizedConfidence * weight * decay * scale;
    categoryScores[normalizedCategory] += contribution;

    const breakdown = {
      signal,
      category: normalizedCategory,
      confidence: normalizedConfidence,
      weight,
      contribution: Number(contribution.toFixed(4))
    };
    if (meta.source) breakdown.source = meta.source;
    if (Number.isFinite(rank)) breakdown.rank = rank;

    signalBreakdown.push(breakdown);
    categoryEvidence[normalizedCategory].push({
      ...breakdown,
      rawConfidence: normalizedConfidence
    });
  };

  const applyRankedSignal = (signal, candidates = [], options = {}) => {
    if (!Array.isArray(candidates) || candidates.length === 0) return;
    candidates
      .slice(0, HYBRID_TOP_CATEGORIES_LIMIT)
      .forEach((candidate, index) => {
        applySignal(signal, candidate.category, candidate.confidence, {
          rank: index,
          scale: options.scale,
          source: options.source
        });
      });
  };

  const primarySignal = getClientPrimarySignal(clientData);
  if (primarySignal) {
    applySignal(primarySignal.signal, primarySignal.category, primarySignal.confidence, {
      source: 'client_primary'
    });

    const clientTopCategories = parseClientTopCategories(clientData);
    if (clientTopCategories.length > 0) {
      applyRankedSignal(primarySignal.signal, clientTopCategories, {
        scale: 0.7,
        source: 'client_ranked'
      });
    }
  }

  const clientObjects = parseClientObjects(clientData);
  const predictionLabels = parseClientPredictions(clientData);
  const allClientLabels = [...toLabelEntries(clientObjects), ...predictionLabels];

  if (allClientLabels.length > 0) {
    const cocoCategory = mapLabelsToCategory(allClientLabels);
    const candidates = Array.isArray(cocoCategory.topCategories) && cocoCategory.topCategories.length > 0
      ? cocoCategory.topCategories
      : [{ category: cocoCategory.category, confidence: cocoCategory.confidence }];
    applyRankedSignal('coco', candidates, {
      scale: 1,
      source: 'client_labels'
    });
  }

  let yoloCategory = null;
  if (Array.isArray(yoloDetections) && yoloDetections.length > 0) {
    yoloCategory = mapYoloObjectsToCategory(yoloDetections);
    const yoloCandidates = Array.isArray(yoloCategory.topCategories) && yoloCategory.topCategories.length > 0
      ? yoloCategory.topCategories
      : [{ category: yoloCategory.category, confidence: yoloCategory.confidence }];

    applyRankedSignal('yolo', yoloCandidates, {
      scale: 1,
      source: 'yolo_objects'
    });

    const fallbackYolo = mapLabelsToCategory(
      yoloDetections.map((det) => ({ label: det.label, confidence: clamp01(det.confidence, 0.5) }))
    );
    const fallbackCandidates = Array.isArray(fallbackYolo.topCategories) && fallbackYolo.topCategories.length > 0
      ? fallbackYolo.topCategories
      : [{ category: fallbackYolo.category, confidence: fallbackYolo.confidence }];
    applyRankedSignal('yolo', fallbackCandidates, {
      scale: 0.55,
      source: 'yolo_label_fallback'
    });
  }

  if (signalBreakdown.length === 0) return null;

  const ranked = Object.entries(categoryScores).sort(([, a], [, b]) => b - a);
  const [topCategory, topScore] = ranked[0] || ['Other', 0];
  const secondScore = ranked[1]?.[1] || 0;
  const totalScore = ranked.reduce((sum, [, score]) => sum + score, 0) || 1;
  const margin = topScore - secondScore;
  const marginRatio = margin / totalScore;
  const topDistribution = topScore / totalScore;

  let finalCategory = topCategory;
  if (topCategory === 'Other') {
    const fallbackNonOther = ranked.find(([category]) => category !== 'Other');
    if (fallbackNonOther && fallbackNonOther[1] >= topScore * 0.8) {
      finalCategory = fallbackNonOther[0];
    }
  }

  const evidenceCount = categoryEvidence[finalCategory]?.length || 0;
  let confidence = (topDistribution * 0.72) + (clamp01(marginRatio / 0.4, 0) * 0.2) + (Math.min(evidenceCount, 4) / 4 * 0.08);

  const clientCategory = normalizeCategory(primarySignal?.category);
  const yoloPrimaryCategory = normalizeCategory(yoloCategory?.category);
  if (clientCategory === finalCategory) confidence += 0.05;
  if (yoloPrimaryCategory === finalCategory) confidence += 0.06;
  if (clientCategory !== 'Other' && yoloPrimaryCategory !== 'Other' && clientCategory !== yoloPrimaryCategory) {
    confidence -= 0.04;
  }

  if (yoloPrimaryCategory === finalCategory && clamp01(yoloCategory?.confidence, 0) >= YOLO_OVERRIDE_CONFIDENCE) {
    confidence += 0.05;
  }

  confidence = Math.max(HYBRID_MIN_CONFIDENCE, Math.min(0.98, confidence));
  const confidenceThreshold = CATEGORY_CONFIDENCE_THRESHOLDS[finalCategory] || 0.55;

  const uncertaintyReasons = [];
  if (confidence < confidenceThreshold) {
    uncertaintyReasons.push(`confidence_below_threshold:${confidenceThreshold.toFixed(2)}`);
  }
  if (marginRatio < HYBRID_UNCERTAIN_MARGIN) {
    uncertaintyReasons.push(`low_margin:${marginRatio.toFixed(3)}`);
  }
  if (finalCategory === 'Other' && confidence < 0.55) {
    uncertaintyReasons.push('other_with_low_confidence');
  }

  const isUncertain = uncertaintyReasons.length > 0;
  const priority = calculatePriorityFromCategory(finalCategory, confidence);
  const topCategories = ranked.slice(0, HYBRID_TOP_CATEGORIES_LIMIT).map(([category, score]) => ({
    category,
    confidence: clamp01(score / totalScore, 0),
    score: Number(score.toFixed(4))
  }));

  const yoloObjects = (yoloDetections || []).map((det) => normalizeObjectEntry({
    name: det.label,
    confidence: det.confidence,
    source: 'yolov8'
  }, 'yolov8')).filter(Boolean);

  const mergedObjectMap = new Map();
  [...clientObjects, ...yoloObjects].forEach((obj) => {
    const key = obj.name.toLowerCase();
    const existing = mergedObjectMap.get(key);
    if (!existing || obj.confidence > existing.confidence) {
      mergedObjectMap.set(key, obj);
    }
  });

  const detectedObjects = Array.from(mergedObjectMap.values()).slice(0, 10);

  const detectedLabels = [
    ...allClientLabels,
    ...yoloObjects.map((obj) => ({ label: obj.name, confidence: obj.confidence }))
  ].slice(0, 15);

  const sources = unique(signalBreakdown.map((item) => {
    if (item.signal === 'fine_tuned') return 'fine_tuned';
    if (item.signal === 'clip') return 'clip';
    if (item.signal === 'coco') return 'coco';
    if (item.signal === 'yolo') return 'yolov8';
    return item.signal;
  }));

  const modelSource = sources.length > 1
    ? `ensemble:${sources.join('+')}`
    : (sources[0] || 'ensemble');

  return {
    category: finalCategory,
    predicted_category: finalCategory,
    priority,
    confidence,
    confidenceThreshold,
    isUncertain,
    uncertaintyReasons,
    topCategories,
    detectedObjects,
    detectedLabels,
    method: 'hybrid',
    model_source: modelSource,
    signalBreakdown,
    isSafeContent: true
  };
};

const analyzeWithGoogleVision = async (buffer) => {
  try {
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient();

    const [result] = await client.annotateImage({
      image: { content: buffer.toString('base64') },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 15 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        { type: 'SAFE_SEARCH_DETECTION' }
      ]
    });

    const labels = result.labelAnnotations?.map(l => ({
      label: l.description,
      confidence: l.score
    })) || [];

    const objects = result.localizedObjectAnnotations?.map(o => ({
      name: o.name,
      confidence: o.score
    })) || [];

    const safeSearch = result.safeSearchAnnotation;
    const isSafeContent = !['LIKELY', 'VERY_LIKELY'].includes(safeSearch?.adult) &&
                          !['LIKELY', 'VERY_LIKELY'].includes(safeSearch?.violence);

    const allLabels = [...labels, ...objects.map(o => ({ label: o.name, confidence: o.confidence }))];
    const mapped = mapLabelsToCategory(allLabels);
    const { category, confidence } = mapped;
    const priority = calculatePriorityFromCategory(category, confidence);
    const confidenceThreshold = CATEGORY_CONFIDENCE_THRESHOLDS[category] || 0.55;

    return {
      category,
      predicted_category: category,
      priority,
      confidence,
      confidenceThreshold,
      isUncertain: confidence < confidenceThreshold,
      uncertaintyReasons: confidence < confidenceThreshold ? ['confidence_below_threshold'] : [],
      topCategories: mapped.topCategories || [{ category, confidence }],
      detectedObjects: objects,
      detectedLabels: labels,
      method: 'google_vision',
      model_source: 'google_vision',
      isSafeContent
    };
  } catch (err) {
    console.error('Google Vision error:', err.message);
    throw err;
  }
};

const fallbackKeywordAnalysis = (clientData = {}) => {
  // Use data sent from client analysis when no stronger server-side signal is available.
  const { category, confidence } = clientData;
  const clientObjects = parseClientObjects(clientData);
  const predictions = parseClientPredictions(clientData);

  if (category && confidence) {
    const normalizedCategory = normalizeCategory(category);
    const priority = calculatePriorityFromCategory(normalizedCategory, confidence);
    const clientTopCategories = parseClientTopCategories(clientData);
    return {
      category: normalizedCategory,
      predicted_category: normalizedCategory,
      priority,
      confidence,
      confidenceThreshold: CATEGORY_CONFIDENCE_THRESHOLDS[normalizedCategory] || 0.55,
      isUncertain: confidence < (CATEGORY_CONFIDENCE_THRESHOLDS[normalizedCategory] || 0.55),
      uncertaintyReasons: confidence < (CATEGORY_CONFIDENCE_THRESHOLDS[normalizedCategory] || 0.55)
        ? ['confidence_below_threshold']
        : [],
      topCategories: clientTopCategories.length > 0
        ? clientTopCategories
        : [{ category: normalizedCategory, confidence: clamp01(confidence, 0) }],
      detectedObjects: clientObjects,
      detectedLabels: predictions,
      method: 'keyword_fallback',
      model_source: clientData.method || 'keyword_fallback',
      isSafeContent: true
    };
  }

  if (clientObjects.length > 0) {
    const mapped = mapLabelsToCategory(toLabelEntries(clientObjects));
    const mappedPriority = calculatePriorityFromCategory(mapped.category, mapped.confidence);
    return {
      category: mapped.category,
      predicted_category: mapped.category,
      priority: mappedPriority,
      confidence: mapped.confidence,
      confidenceThreshold: CATEGORY_CONFIDENCE_THRESHOLDS[mapped.category] || 0.55,
      isUncertain: mapped.confidence < (CATEGORY_CONFIDENCE_THRESHOLDS[mapped.category] || 0.55),
      uncertaintyReasons: mapped.confidence < (CATEGORY_CONFIDENCE_THRESHOLDS[mapped.category] || 0.55)
        ? ['confidence_below_threshold']
        : [],
      topCategories: mapped.topCategories || [{ category: mapped.category, confidence: mapped.confidence }],
      detectedObjects: clientObjects,
      detectedLabels: toLabelEntries(clientObjects),
      method: 'keyword_fallback',
      model_source: 'keyword_fallback',
      isSafeContent: true
    };
  }

  return {
    category: 'Other',
    predicted_category: 'Other',
    priority: 'Medium',
    confidence: 0.3,
    confidenceThreshold: CATEGORY_CONFIDENCE_THRESHOLDS.Other,
    isUncertain: true,
    uncertaintyReasons: ['no_strong_signal'],
    topCategories: [{ category: 'Other', confidence: 0.3 }],
    detectedObjects: [],
    detectedLabels: [],
    method: 'keyword_fallback',
    model_source: 'keyword_fallback',
    isSafeContent: true
  };
};

const categorizeByCampusIssue = (labels) => {
  return mapLabelsToCategory(labels);
};

const analyzeImage = async (buffer, clientData = {}, context = {}) => {
  if (hasGroqVisionEnabled()) {
    try {
      const groqResult = await classifyImageWithGroq({
        buffer,
        mimeType: context?.mimeType,
        clientData
      });
      return attachClientTextHints(groqResult, clientData);
    } catch (err) {
      console.warn('[Groq] Falling back to local pipeline:', err.message);
    }
  }

  if (process.env.GOOGLE_VISION_ENABLED === 'true') {
    try {
      const visionResult = await analyzeWithGoogleVision(buffer);
      return attachClientTextHints(visionResult, clientData);
    } catch (err) {
      console.warn('Falling back to keyword analysis:', err.message);
    }
  }

  const imagePath = context?.imagePath || clientData?.imagePath;
  let yoloDetections = [];

  try {
    const yoloOutput = await runYoloDetection(imagePath);
    yoloDetections = Array.isArray(yoloOutput?.detections) ? yoloOutput.detections : [];
  } catch (err) {
    console.warn('[YOLO] Falling back without YOLO signal:', err.message);
  }

  const hybrid = buildHybridAnalysis({ clientData, yoloDetections });
  if (hybrid) {
    return attachClientTextHints(hybrid, clientData);
  }

  return attachClientTextHints(fallbackKeywordAnalysis(clientData), clientData);
};

module.exports = {
  analyzeWithGoogleVision,
  fallbackKeywordAnalysis,
  categorizeByCampusIssue,
  calculatePriorityFromCategory: require('../utils/categoryMapper').calculatePriorityFromCategory,
  runYoloDetection,
  analyzeImage
};

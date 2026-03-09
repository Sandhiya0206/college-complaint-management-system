// Server-side image analysis service
// Uses Google Vision if enabled, falls back to keyword-based analysis

const { mapLabelsToCategory, calculatePriorityFromCategory } = require('../utils/categoryMapper');

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
    const { category, confidence } = mapLabelsToCategory(allLabels);
    const priority = calculatePriorityFromCategory(category, confidence);

    return {
      category,
      priority,
      confidence,
      detectedObjects: objects,
      detectedLabels: labels,
      method: 'google_vision',
      isSafeContent
    };
  } catch (err) {
    console.error('Google Vision error:', err.message);
    throw err;
  }
};

const fallbackKeywordAnalysis = (clientData = {}) => {
  // Use data sent from client TF.js analysis
  const { category, confidence, detectedObjects = [], predictions = [] } = clientData;

  if (category && confidence) {
    const priority = calculatePriorityFromCategory(category, confidence);
    return {
      category,
      priority,
      confidence,
      detectedObjects,
      detectedLabels: predictions.map(p => ({ label: p.className || p, confidence: p.probability || 0.5 })),
      method: 'keyword_fallback',
      isSafeContent: true
    };
  }

  return {
    category: 'Other',
    priority: 'Medium',
    confidence: 0.3,
    detectedObjects: [],
    detectedLabels: [],
    method: 'keyword_fallback',
    isSafeContent: true
  };
};

const categorizeByCampusIssue = (labels) => {
  return mapLabelsToCategory(labels);
};

const analyzeImage = async (buffer, clientData = {}) => {
  if (process.env.GOOGLE_VISION_ENABLED === 'true') {
    try {
      return await analyzeWithGoogleVision(buffer);
    } catch (err) {
      console.warn('Falling back to keyword analysis:', err.message);
    }
  }
  return fallbackKeywordAnalysis(clientData);
};

module.exports = {
  analyzeWithGoogleVision,
  fallbackKeywordAnalysis,
  categorizeByCampusIssue,
  calculatePriorityFromCategory: require('../utils/categoryMapper').calculatePriorityFromCategory,
  analyzeImage
};

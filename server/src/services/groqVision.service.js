const VALID_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Furniture',
  'Cleanliness',
  'Internet/WiFi',
  'Infrastructure',
  'Security',
  'AC/Ventilation',
  'Other'
];

const VALID_PRIORITIES = ['High', 'Medium', 'Low'];
const IRRELEVANT_COMPLAINT_MESSAGE = 'This is an irrelevant complaint that cannot be resolved through this application. If it is relevant to you, please contact management or staff about this complaint.';

const CATEGORY_TO_TEAM = Object.freeze({
  Electrical: 'electrical',
  Plumbing: 'plumbing',
  Furniture: 'maintenance',
  Cleanliness: 'housekeeping',
  'Internet/WiFi': 'IT support',
  Infrastructure: 'civil maintenance',
  Security: 'security',
  'AC/Ventilation': 'HVAC maintenance',
  Other: 'maintenance'
});

const CATEGORY_ALIASES = Object.freeze({
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  furniture: 'Furniture',
  cleanliness: 'Cleanliness',
  cleaning: 'Cleanliness',
  internet: 'Internet/WiFi',
  wifi: 'Internet/WiFi',
  'internet/wifi': 'Internet/WiFi',
  network: 'Internet/WiFi',
  infrastructure: 'Infrastructure',
  security: 'Security',
  ac: 'AC/Ventilation',
  ventilation: 'AC/Ventilation',
  'ac/ventilation': 'AC/Ventilation',
  other: 'Other'
});

const cleanText = (value, maxLen = 400) => {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.slice(0, maxLen);
};

const clamp01 = (value, fallback = 0.5) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, num));
};

const normalizeTitle = (value, fallbackCategory = 'Other') => {
  const raw = cleanText(value, 150)
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const base = raw || `${fallbackCategory} issue`;
  const words = base.split(' ').filter(Boolean).slice(0, 10);
  return words.join(' ').replace(/[.!?]+$/g, '').trim();
};

const buildDetailedDescription = ({ category, description, objects = [], reason = '' }) => {
  const cleanDescription = cleanText(description, 1000);
  if (cleanDescription.length >= 120) return cleanDescription;

  const team = CATEGORY_TO_TEAM[category] || 'maintenance';
  const objectHint = Array.isArray(objects) && objects.length > 0
    ? ` Visible signs include ${objects.slice(0, 4).join(', ')}.`
    : '';
  const reasonHint = cleanText(reason, 200)
    ? ` ${cleanText(reason, 200)}`
    : '';

  return cleanText(
    `This image appears to show a ${category.toLowerCase()} complaint in a campus area.${objectHint} The issue can affect normal student activity and should be inspected quickly by the ${team} team.${reasonHint}`,
    1000
  );
};

const normalizeCategory = (value) => {
  const raw = cleanText(value, 80);
  if (!raw) return 'Other';
  if (VALID_CATEGORIES.includes(raw)) return raw;

  const alias = CATEGORY_ALIASES[raw.toLowerCase()];
  return alias || 'Other';
};

const normalizePriority = (value) => {
  const raw = cleanText(value, 20);
  if (!raw) return 'Medium';
  if (VALID_PRIORITIES.includes(raw)) return raw;

  const lower = raw.toLowerCase();
  if (lower === 'high') return 'High';
  if (lower === 'low') return 'Low';
  return 'Medium';
};

const safeJsonParse = (text) => {
  if (!text) return null;

  const stripped = String(text)
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  if (!stripped) return null;

  try {
    return JSON.parse(stripped);
  } catch (err) {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch (innerErr) {
        return null;
      }
    }
    return null;
  }
};

const buildSystemPrompt = () => `You are an expert campus maintenance vision classifier.
Analyze the provided image and return ONLY minified JSON.

Valid categories: ${VALID_CATEGORIES.join(', ')}
Priority rules:
- High: safety risk, electrical/fire/flood hazard, sewage overflow, major damage
- Medium: service disruption or important malfunction
- Low: cosmetic or minor issue

Title rules:
- Must be a single line only
- Use simple words understandable by students
- Maximum 8 words

Description rules:
- Must be accurate from visible evidence in the image
- 2 to 3 sentences
- 30 to 80 words
- Mention what is seen and what maintenance action is needed

Irrelevant detection:
- If image is not a campus maintenance complaint resolvable by this app (for example: personal issue, academic/admin issue, non-maintenance scene), set isRelevant=false
- When isRelevant=false, set category="Other", priority="Low", confidence<=0.4, and give irrelevantReason

Return exactly this JSON schema:
{"isRelevant":true,"category":"<one valid category>","priority":"High|Medium|Low","confidence":0.0,"title":"one-line simple title","description":"detailed accurate description","reason":"one concise sentence","objects":["item1","item2"],"irrelevantReason":""}`;

const hasGroqVisionEnabled = () => {
  if (!process.env.GROQ_API_KEY) return false;
  return process.env.GROQ_IMAGE_ANALYSIS_ENABLED !== 'false';
};

const hasGroqTextEnabled = () => {
  if (!process.env.GROQ_API_KEY) return false;
  return process.env.GROQ_TEXT_ANALYSIS_ENABLED !== 'false';
};

const buildTextSystemPrompt = () => `You are an expert campus maintenance complaint text classifier.
Read the student's complaint description and return ONLY minified JSON.

Valid categories: ${VALID_CATEGORIES.join(', ')}
Priority rules:
- High: safety risk, electrical/fire/flood hazard, sewage overflow, major damage
- Medium: service disruption or important malfunction
- Low: cosmetic or minor issue

Title rules:
- Must be a single line only
- Use simple words understandable by students
- Maximum 8 words

Return exactly this JSON schema:
{"category":"<one valid category>","priority":"High|Medium|Low","confidence":0.0,"title":"one-line simple title","reason":"one concise sentence"}`;

const classifyImageWithGroq = async ({ buffer, mimeType = 'image/jpeg', clientData = {} }) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const apiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
  const model = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
  const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 25000);

  const hintTitle = cleanText(clientData?.title, 150);
  const hintDescription = cleanText(clientData?.description, 600);
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`;

  const userPrompt = [
    'Classify this campus maintenance complaint image.',
    hintTitle ? `Student title hint: ${hintTitle}` : '',
    hintDescription ? `Student description hint: ${hintDescription}` : ''
  ].filter(Boolean).join('\n');

  const payload = {
    model,
    temperature: 0.1,
    max_tokens: 350,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ]
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[Groq] API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonParse(rawText);

  if (!parsed) {
    throw new Error('[Groq] Returned unparseable JSON');
  }

  const category = normalizeCategory(parsed.category);
  const priority = normalizePriority(parsed.priority);
  const parsedConfidence = Number(parsed.confidence);
  const confidence = Number.isFinite(parsedConfidence) && parsedConfidence > 0
    ? clamp01(parsedConfidence, 0.7)
    : 0.7;
  const confidenceThreshold = 0.55;
  const objects = Array.isArray(parsed.objects) ? parsed.objects : [];

  const detectedObjects = objects
    .map((name) => cleanText(typeof name === 'string' ? name : '', 60))
    .filter(Boolean)
    .slice(0, 8)
    .map((name) => ({
      name,
      confidence: 0.9,
      source: 'groq'
    }));

  const reason = cleanText(parsed.reason, 250);

  const explicitRelevant = typeof parsed.isRelevant === 'boolean' ? parsed.isRelevant : null;
  const irrelevantReason = cleanText(parsed.irrelevantReason, 240);
  const reasonSuggestsIrrelevant = /not\s+maintenance|irrelevant|cannot\s+classify|non-maintenance|not\s+related\s+to\s+maintenance/i.test(`${reason} ${irrelevantReason}`);
  const inferredIrrelevant = category === 'Other' && confidence <= 0.45 && reasonSuggestsIrrelevant;
  const isIrrelevant = explicitRelevant === false || inferredIrrelevant;

  if (isIrrelevant) {
    return {
      category: 'Other',
      predicted_category: 'Other',
      priority: 'Low',
      confidence: Math.min(confidence, 0.4),
      confidenceThreshold,
      isUncertain: true,
      uncertaintyReasons: ['irrelevant_complaint_image'],
      topCategories: [{ category: 'Other', confidence: Math.min(confidence, 0.4) }],
      detectedObjects,
      detectedLabels: detectedObjects.map((obj) => ({ label: obj.name, confidence: obj.confidence })),
      method: 'groq_vision',
      model_source: `groq:${model}`,
      isSafeContent: true,
      isIrrelevant: true,
      reason: irrelevantReason || reason,
      title: 'Irrelevant complaint image',
      description: IRRELEVANT_COMPLAINT_MESSAGE,
      suggestedTitle: '',
      suggestedDescription: ''
    };
  }

  const title = normalizeTitle(parsed.title, category);
  const objectNames = detectedObjects.map((obj) => obj.name);
  const description = buildDetailedDescription({
    category,
    description: parsed.description,
    objects: objectNames,
    reason
  });

  return {
    category,
    predicted_category: category,
    priority,
    confidence,
    confidenceThreshold,
    isUncertain: confidence < confidenceThreshold,
    uncertaintyReasons: confidence < confidenceThreshold ? ['confidence_below_threshold'] : [],
    topCategories: [{ category, confidence }],
    detectedObjects,
    detectedLabels: detectedObjects.map((obj) => ({ label: obj.name, confidence: obj.confidence })),
    method: 'groq_vision',
    model_source: `groq:${model}`,
    isSafeContent: true,
    reason,
    title,
    description,
    suggestedTitle: title,
    suggestedDescription: description
  };
};

const classifyTextWithGroq = async ({ description = '', title = '' }) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const inputDescription = cleanText(description, 1200);
  if (!inputDescription || inputDescription.length < 6) {
    throw new Error('Description is too short for text analysis');
  }

  const inputTitle = cleanText(title, 150);
  const apiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
  const model = process.env.GROQ_TEXT_MODEL || process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
  const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 25000);

  const userPrompt = [
    inputTitle ? `Title hint: ${inputTitle}` : '',
    `Complaint description: ${inputDescription}`
  ].filter(Boolean).join('\n');

  const payload = {
    model,
    temperature: 0.1,
    max_tokens: 220,
    messages: [
      { role: 'system', content: buildTextSystemPrompt() },
      { role: 'user', content: userPrompt }
    ]
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[Groq Text] API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonParse(rawText);

  if (!parsed) {
    throw new Error('[Groq Text] Returned unparseable JSON');
  }

  const category = normalizeCategory(parsed.category);
  const priority = normalizePriority(parsed.priority);
  const parsedConfidence = Number(parsed.confidence);
  const confidence = Number.isFinite(parsedConfidence) && parsedConfidence > 0
    ? clamp01(parsedConfidence, 0.72)
    : 0.72;
  const reason = cleanText(parsed.reason, 250);
  const normalizedTitle = normalizeTitle(parsed.title, category);

  return {
    category,
    predicted_category: category,
    priority,
    confidence,
    confidenceThreshold: 0.55,
    isUncertain: confidence < 0.55,
    uncertaintyReasons: confidence < 0.55 ? ['confidence_below_threshold'] : [],
    topCategories: [{ category, confidence }],
    detectedObjects: [],
    detectedLabels: [],
    method: 'groq_text',
    model_source: `groq:${model}`,
    isSafeContent: true,
    reason,
    title: normalizedTitle,
    description: inputDescription,
    suggestedTitle: normalizedTitle,
    suggestedDescription: inputDescription
  };
};

module.exports = {
  classifyImageWithGroq,
  hasGroqVisionEnabled,
  classifyTextWithGroq,
  hasGroqTextEnabled
};
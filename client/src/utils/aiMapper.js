import { CATEGORY_KEYWORD_MAP, PRIORITY_RULES } from './constants'

/**
 * Direct MobileNet ImageNet class â†’ campus category map
 * These are ACTUAL labels MobileNet returns â€” never rely on substring-only matching
 */
const MOBILENET_DIRECT_MAP = {
  // ELECTRICAL
  'spotlight': 'Electrical', 'table lamp': 'Electrical', 'floor lamp': 'Electrical',
  'desk lamp': 'Electrical', 'torch': 'Electrical', 'lampshade': 'Electrical',
  'extension cord': 'Electrical', 'power strip': 'Electrical', 'electric fan': 'Electrical',
  'projector': 'Electrical', 'television': 'Electrical', 'neon sign': 'Electrical',
  'fluorescent': 'Electrical', 'light bulb': 'Electrical', 'street light': 'Electrical',
  'strainer': 'Electrical', 'matchstick': 'Electrical', 'candle': 'Electrical',
  // AC / VENTILATION
  'oscillating fan': 'AC/Ventilation', 'ceiling fan': 'AC/Ventilation',
  'pedestal fan': 'AC/Ventilation', 'room fan': 'AC/Ventilation',
  'air conditioner': 'AC/Ventilation', 'radiator': 'AC/Ventilation',
  'space heater': 'AC/Ventilation', 'humidifier': 'AC/Ventilation',
  // PLUMBING
  'bathtub': 'Plumbing', 'bathing tub': 'Plumbing', 'washbasin': 'Plumbing',
  'sink': 'Plumbing', 'toilet seat': 'Plumbing', 'shower curtain': 'Plumbing',
  'shower cap': 'Plumbing', 'faucet': 'Plumbing', 'water tower': 'Plumbing',
  'water jug': 'Plumbing', 'hose': 'Plumbing', 'plunger': 'Plumbing',
  'bucket': 'Plumbing', 'mop': 'Plumbing', 'water pump': 'Plumbing',
  // FURNITURE
  'folding chair': 'Furniture', 'rocking chair': 'Furniture', 'barber chair': 'Furniture',
  'windsor chair': 'Furniture', 'school desk': 'Furniture', 'dining table': 'Furniture',
  'picnic table': 'Furniture', 'bookcase': 'Furniture', 'bookshelf': 'Furniture',
  'wardrobe': 'Furniture', 'file cabinet': 'Furniture', 'studio couch': 'Furniture',
  'medicine chest': 'Furniture', 'chiffonier': 'Furniture', 'blackboard': 'Furniture',
  'window shade': 'Furniture', 'pillow': 'Furniture', 'locker': 'Furniture',
  // CLEANLINESS
  'garbage truck': 'Cleanliness', 'trash can': 'Cleanliness', 'ashcan': 'Cleanliness',
  'wastebasket': 'Cleanliness', 'broom': 'Cleanliness', 'vacuum cleaner': 'Cleanliness',
  'dustbin': 'Cleanliness',
  // INTERNET/WIFI
  'router': 'Internet/WiFi', 'modem': 'Internet/WiFi',
  'coaxial cable': 'Internet/WiFi', 'network cable': 'Internet/WiFi',
  // INFRASTRUCTURE
  'staircase': 'Infrastructure', 'tile': 'Infrastructure', 'brick': 'Infrastructure',
  'sliding door': 'Infrastructure', 'revolving door': 'Infrastructure',
  'handrail': 'Infrastructure', 'fire escape': 'Infrastructure',
  // SECURITY
  'combination lock': 'Security', 'padlock': 'Security', 'safe': 'Security',
  'surveillance camera': 'Security', 'barbed wire': 'Security',
  'chain link fence': 'Security',
}

/** Urgency signals â€” override priority when detected */
const URGENCY_HIGH = ['fire', 'smoke', 'flame', 'flood', 'overflow', 'burst', 'exposed wire',
  'sparks', 'short', 'raw sewage', 'leak', 'broken glass', 'collapsed', 'water damage']
const URGENCY_LOW  = ['dust', 'minor', 'slight', 'old', 'worn', 'faded', 'small']

/**
 * Map TF.js predictions â†’ campus category with confidence score
 */
export const mapPredictionsToCategory = (predictions = [], detections = []) => {
  const scores = {}
  Object.keys(CATEGORY_KEYWORD_MAP).forEach(cat => { scores[cat] = 0 })

  const scoreLabel = (text, baseProbability, directWeight, keywordWeight) => {
    const lower = text.toLowerCase()
    // 1. Direct map (highest accuracy)
    for (const [label, category] of Object.entries(MOBILENET_DIRECT_MAP)) {
      if (lower.includes(label.toLowerCase()) || label.toLowerCase().includes(lower)) {
        scores[category] += baseProbability * directWeight
        return
      }
    }
    // 2. Keyword fallback
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORD_MAP)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          scores[category] += baseProbability * keywordWeight
          return
        }
      }
    }
  }

  // MobileNet top-5 predictions
  predictions.forEach(({ className, probability }) => {
    if (className && probability) scoreLabel(className, probability, 4, 2)
  })

  // COCO-SSD object detections
  detections.forEach(({ class: cls, score }) => {
    if (cls) scoreLabel(cls, score, 3, 1.5)
  })

  const sorted = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a)

  if (sorted.length === 0) {
    return { category: 'Other', confidence: 0.3, detectedObjects: [], allScores: [] }
  }

  const [topCategory, topScore] = sorted[0]
  const secondScore = sorted[1]?.[1] || 0
  const dominance = secondScore > 0 ? topScore / (topScore + secondScore) : 1
  const rawConf = Math.min(topScore / 3, 0.97)
  const confidence = Math.min(rawConf * 0.6 + dominance * 0.35, 0.96)

  const detectedObjects = [
    ...predictions.slice(0, 5).map(p => ({ name: p.className, confidence: p.probability, source: 'mobilenet' })),
    ...detections.slice(0, 3).map(d => ({ name: d.class, confidence: d.score, source: 'coco-ssd' }))
  ].filter(o => o.confidence > 0.05)

  return {
    category: topCategory,
    confidence,
    detectedObjects,
    allScores: sorted.slice(0, 3).map(([cat, sc]) => ({ category: cat, score: Number(sc.toFixed(3)) }))
  }
}

/**
 * Smart priority â€” uses category base + detected urgency signals
 */
export const calculatePriority = (category, confidence = 1, detectedObjects = [], description = '') => {
  let priority = 'Medium'
  if (PRIORITY_RULES.High.includes(category)) priority = 'High'
  else if (PRIORITY_RULES.Low.includes(category)) priority = 'Low'

  const allText = [
    ...detectedObjects.map(o => (o.name || '').toLowerCase()),
    description.toLowerCase()
  ].join(' ')

  // Urgency upgrade â€” fire/flood/etc always â†’ High
  if (URGENCY_HIGH.some(s => allText.includes(s))) return 'High'

  // Urgency downgrade for clearly minor issues
  if (URGENCY_LOW.some(s => allText.includes(s)) && priority !== 'High') {
    if (priority === 'Medium') priority = 'Low'
  }

  // Confidence-based adjustment
  if (confidence < 0.45 && priority === 'High') priority = 'Medium'
  if (confidence < 0.30 && priority === 'Medium') priority = 'Low'

  return priority
}

/**
 * Real-time text analysis from description + location fields
 */
export const analyzeText = (text = '') => {
  if (!text || text.trim().length < 3) return null
  const lower = text.toLowerCase()
  const scores = {}
  Object.keys(CATEGORY_KEYWORD_MAP).forEach(cat => { scores[cat] = 0 })

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORD_MAP)) {
    if (category === 'Other') continue
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        scores[category] += keyword.length > 6 ? 4 : keyword.length > 4 ? 2 : 1
      }
    }
  }

  const sorted = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a)

  if (sorted.length === 0 || sorted[0][1] < 2) return null

  const [topCategory, topScore] = sorted[0]
  const secondScore = sorted[1]?.[1] || 0
  const confidence = Math.min(0.35 + (topScore - secondScore) * 0.08, 0.82)
  const priority = calculatePriority(topCategory, confidence, [], lower)

  return { category: topCategory, priority, confidence, method: 'text_analysis', detectedObjects: [] }
}

/** Merge image + text result: image wins if confident enough */
export const mergeImageAndText = (imageResult, textResult) => {
  if (!imageResult && !textResult) return null
  if (!imageResult) return textResult
  if (!textResult) return imageResult
  if (imageResult.confidence >= 0.52) return { ...imageResult, textHint: textResult.category }
  if (textResult.confidence > imageResult.confidence) return { ...textResult, imageHint: imageResult.category }
  return { ...imageResult, textHint: textResult.category }
}

export const mergeClientServerResults = (clientResult, serverResult) => {
  if (!serverResult) return clientResult
  if (!clientResult) return serverResult
  if ((serverResult.confidence || 0) > (clientResult.confidence || 0)) return { ...serverResult, method: 'hybrid' }
  return { ...clientResult, method: 'hybrid' }
}

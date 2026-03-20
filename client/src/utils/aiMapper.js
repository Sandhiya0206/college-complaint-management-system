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
 * High-precision multi-word phrase map.
 * Each entry: [phrase, category, weight]
 * Checked before single keywords — matched phrases get much higher confidence.
 */
const PHRASE_MAP = [
  // ── Electrical ──────────────────────────────────────────────────────────────
  ['light not coming',         'Electrical', 15],
  ['light not working',        'Electrical', 15],
  ['lights not working',       'Electrical', 15],
  ['current not coming',       'Electrical', 15],
  ['current not going',        'Electrical', 15],
  ['current gone',             'Electrical', 12],
  ['no power supply',          'Electrical', 12],
  ['no current',               'Electrical', 12],
  ['tube light not',           'Electrical', 12],
  ['bulb fused',               'Electrical', 12],
  ['bulb not working',         'Electrical', 12],
  ['switch not working',       'Electrical', 12],
  ['socket not working',       'Electrical', 12],
  ['switchboard not working',  'Electrical', 12],
  ['short circuit',            'Electrical', 15],
  ['electric shock',           'Electrical', 18],
  ['sparking wire',            'Electrical', 15],
  ['fuse blown',               'Electrical', 12],
  ['mcb tripped',              'Electrical', 12],
  ['wiring problem',           'Electrical', 12],
  ['power cut',                'Electrical', 10],
  // ── Plumbing ─────────────────────────────────────────────────────────────────
  ['water not coming',         'Plumbing', 15],
  ['no water supply',          'Plumbing', 15],
  ['water supply problem',     'Plumbing', 12],
  ['water problem',            'Plumbing', 10],
  ['pipe leaking',             'Plumbing', 15],
  ['pipe burst',               'Plumbing', 18],
  ['tap dripping',             'Plumbing', 12],
  ['tap leaking',              'Plumbing', 12],
  ['tap not working',          'Plumbing', 12],
  ['toilet blocked',           'Plumbing', 15],
  ['toilet not flushing',      'Plumbing', 15],
  ['toilet overflow',          'Plumbing', 15],
  ['flush not working',        'Plumbing', 15],
  ['drain blocked',            'Plumbing', 12],
  ['drain clogged',            'Plumbing', 12],
  ['bathroom flooding',        'Plumbing', 18],
  ['water leaking',            'Plumbing', 12],
  ['water seeping',            'Plumbing', 12],
  ['overhead tank',            'Plumbing', 10],
  // ── Furniture ────────────────────────────────────────────────────────────────
  ['chair broken',             'Furniture', 15],
  ['table broken',             'Furniture', 15],
  ['bench broken',             'Furniture', 15],
  ['desk broken',              'Furniture', 15],
  ['door not closing',         'Furniture', 12],
  ['door not locking',         'Furniture', 10],
  ['window broken',            'Furniture', 12],
  ['window glass broken',      'Furniture', 15],
  ['cupboard broken',          'Furniture', 12],
  ['locker broken',            'Furniture', 12],
  ['hinge broken',             'Furniture', 10],
  ['door knob broken',         'Furniture', 12],
  // ── Cleanliness ──────────────────────────────────────────────────────────────
  ['not cleaned',              'Cleanliness', 12],
  ['not swept',                'Cleanliness', 12],
  ['garbage not collected',    'Cleanliness', 15],
  ['garbage not removed',      'Cleanliness', 15],
  ['dustbin full',             'Cleanliness', 12],
  ['dustbin overflowing',      'Cleanliness', 12],
  ['bad smell',                'Cleanliness', 12],
  ['foul smell',               'Cleanliness', 12],
  ['smell problem',            'Cleanliness', 10],
  ['pest infestation',         'Cleanliness', 15],
  ['cockroach problem',        'Cleanliness', 15],
  ['rat problem',              'Cleanliness', 12],
  ['mosquito breeding',        'Cleanliness', 12],
  ['dirty toilet',             'Cleanliness', 12],
  ['dirty washroom',           'Cleanliness', 12],
  ['stagnant water',           'Cleanliness', 12],
  // ── AC/Ventilation ───────────────────────────────────────────────────────────
  ['ac not working',           'AC/Ventilation', 15],
  ['ac not cooling',           'AC/Ventilation', 15],
  ['air conditioner not',      'AC/Ventilation', 15],
  ['no cooling',               'AC/Ventilation', 12],
  ['room very hot',            'AC/Ventilation', 12],
  ['no ventilation',           'AC/Ventilation', 12],
  ['exhaust fan not working',  'AC/Ventilation', 12],
  ['exhaust not working',      'AC/Ventilation', 12],
  ['ac dripping',              'AC/Ventilation', 10],
  ['ac making noise',          'AC/Ventilation', 10],
  ['fan not cooling',          'AC/Ventilation', 12],
  ['room is stuffy',           'AC/Ventilation', 10],
  // ── Internet/WiFi ────────────────────────────────────────────────────────────
  ['wifi not working',         'Internet/WiFi', 15],
  ['wifi not connecting',      'Internet/WiFi', 15],
  ['no wifi',                  'Internet/WiFi', 12],
  ['internet not working',     'Internet/WiFi', 15],
  ['slow internet',            'Internet/WiFi', 10],
  ['no internet',              'Internet/WiFi', 12],
  ['network not working',      'Internet/WiFi', 12],
  ['net not working',          'Internet/WiFi', 15],
  ['lan not working',          'Internet/WiFi', 12],
  ['wifi disconnecting',       'Internet/WiFi', 10],
  ['no signal',                'Internet/WiFi', 10],
  ['network problem',          'Internet/WiFi', 10],
  // ── Infrastructure ───────────────────────────────────────────────────────────
  ['wall crack',               'Infrastructure', 15],
  ['crack in wall',            'Infrastructure', 15],
  ['ceiling crack',            'Infrastructure', 15],
  ['crack in ceiling',         'Infrastructure', 15],
  ['roof leaking',             'Infrastructure', 15],
  ['roof leak',                'Infrastructure', 12],
  ['floor tile broken',        'Infrastructure', 12],
  ['tile broken',              'Infrastructure', 10],
  ['tile cracked',             'Infrastructure', 10],
  ['plaster falling',          'Infrastructure', 15],
  ['plaster peeling',          'Infrastructure', 12],
  ['paint peeling',            'Infrastructure', 10],
  ['railing loose',            'Infrastructure', 12],
  ['broken step',              'Infrastructure', 12],
  ['staircase damaged',        'Infrastructure', 12],
  ['wall seepage',             'Infrastructure', 12],
  ['seepage in wall',          'Infrastructure', 12],
  // ── Security ─────────────────────────────────────────────────────────────────
  ['lock broken',              'Security', 15],
  ['door lock broken',         'Security', 15],
  ['cctv not working',         'Security', 15],
  ['gate not locking',         'Security', 12],
  ['fire extinguisher',        'Security', 10],
  ['unauthorized entry',       'Security', 15],
  ['lost key',                 'Security', 10],
]

/**
 * Real-time text analysis from description + location fields.
 * Phase 1: phrase matching (high-precision, high-weight).
 * Phase 2: single keyword scoring (broad coverage, lower weight).
 */
export const analyzeText = (text = '') => {
  if (!text || text.trim().length < 3) return null
  const lower = text.toLowerCase()
  const scores = {}
  Object.keys(CATEGORY_KEYWORD_MAP).forEach(cat => { scores[cat] = 0 })

  // ── Phase 1: multi-word phrase matching ──────────────────────────────────────
  for (const [phrase, category, weight] of PHRASE_MAP) {
    if (lower.includes(phrase)) {
      scores[category] += weight
    }
  }

  // ── Phase 2: single-keyword scoring ──────────────────────────────────────────
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
  // Phrase-boosted confidence: scores ≥12 = phrase match → floor 0.70 confidence
  const baseConf  = Math.min(0.35 + (topScore - secondScore) * 0.08, 0.82)
  const confidence = topScore >= 12 ? Math.max(baseConf, 0.70) : baseConf
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

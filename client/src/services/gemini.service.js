/**
 * Gemini Vision API — image classification for campus complaint categories
 *
 * Uses gemini-1.5-flash (multimodal) to analyze an uploaded image and return:
 *  - category  : one of the 9 campus categories
 *  - priority  : High | Medium | Low
 *  - confidence: 0–1 float
 *  - reason    : short human-readable explanation from the model
 *  - objects   : array of detected objects / observations
 */

// Models tried in order — 2.0-flash-lite is a separate quota bucket from 2.0-flash.
// gemini-1.5-flash / gemini-1.5-flash-8b return 404 on this API key (deprecated).
// gemini-2.5-flash is a thinking model — we suppress thinking with thinkingBudget:0
// and filter out thought parts when parsing the response.
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
]

// Same list for text classification
const GEMINI_TEXT_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
]
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const VALID_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Furniture',
  'Cleanliness',
  'Internet/WiFi',
  'Infrastructure',
  'Security',
  'AC/Ventilation',
  'Other',
]

// Models whose FREE-TIER *daily* quota is exhausted — skip them for the rest of this browser session
const _dailyExhausted = new Set()

const SYSTEM_PROMPT = `You are a campus maintenance classifier. Analyse this photo and reply ONLY with minified JSON — no markdown, no extra text.
Categories: ${VALID_CATEGORIES.join(', ')}
Priority: High (safety hazard/health risk), Medium (service disruption), Low (cosmetic/minor)
Severity: critical|high|normal
JSON: {"category":"...","priority":"...","confidence":0.0,"title":"5-8 word title","description":"what you see and action needed","severity":"normal","reason":"one sentence","objects":["item1"]}`

/**
 * Resize image to max 768px and compress to JPEG ~0.75 quality before base64 encoding.
 * Reduces payload from ~4MB → ~80KB, making Gemini calls 10–20× faster.
 */
const resizeAndEncode = (file) =>
  new Promise((resolve, reject) => {
    const MAX = 768
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })

/**
 * Classify an image file using the Gemini Vision API.
 * @param {File} file - The image file to classify
 * @returns {Promise<{category, priority, confidence, reason, objects, method}>}
 */
export const classifyWithGemini = async (file) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set')

  const { base64, mimeType } = await resizeAndEncode(file)
  console.log(`[Gemini] Image compressed → ${(base64.length * 0.75 / 1024).toFixed(0)} KB`)

  const payload = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
      // Suppress thinking tokens so they don't truncate the JSON output.
      // Part filtering in the response parser handles any residual thought parts.
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  // Skip to next model immediately on 429 — don’t wait 58s, keep image analysis < 5s
  const tryModel = async (model) => {
    if (_dailyExhausted.has(model)) {
      console.warn(`[Gemini Vision] ${model} — daily quota exhausted (cached), skipping`)
      return null
    }
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`
    console.log(`[Gemini Vision] Trying model: ${model}`)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.status === 429) {
      const body = await res.text()
      if (body.includes('PerDay')) {
        _dailyExhausted.add(model)
        console.warn(`[Gemini Vision] ${model} daily quota exhausted — skipping for this session`)
      } else {
        console.warn(`[Gemini Vision] ${model} quota/rate-limit — skipping to next model`)
      }
      return { ok: false, status: 429, _body: body }
    }
    return res
  }

  let response, lastError
  for (const model of GEMINI_MODELS) {
    const res = await tryModel(model)
    if (!res) continue
    if (res.ok) { console.log(`[Gemini Vision] ✓ Using ${model}`); response = res; break }
    lastError = res._body ?? await res.text()
    console.warn(`[Gemini Vision] ${model} failed (${res.status}):`, lastError)
  }

  if (!response) throw new Error(`All Gemini models failed. Last error: ${lastError}`)

  const data = await response.json()
  // gemini-2.5-flash thinking model: parts[0] may be the 'thought' content.
  // Filter to only non-thought parts to get the actual JSON output.
  const parts = data?.candidates?.[0]?.content?.parts || []
  const rawText = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim()
    || parts.map(p => p.text || '').join('').trim()

  // Strip any accidental markdown fences
  const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    // Partial JSON fallback: regex-extract fields from truncated response.
    // Use [^",}\n]+ (no closing quote required) to handle hard-truncated strings like
    //   {"category":"Plumbing   ← no closing quote because output was cut off.
    const catMatch  = rawText.match(/"category"\s*:\s*"([^",}\n]+)/)
    const prioMatch = rawText.match(/"priority"\s*:\s*"([^",}\n]+)/)
    const confMatch = rawText.match(/"confidence"\s*:\s*([\d.]+)/)
    const titleMatch = rawText.match(/"title"\s*:\s*"([^"\n]{3,})/)
    if (catMatch?.[1]) {
      console.warn('[Gemini Vision] Partial JSON recovered from truncated response')
      parsed = {
        category:   catMatch[1],
        priority:   prioMatch?.[1]  || 'Medium',
        confidence: confMatch ? parseFloat(confMatch[1]) : 0.7,
        title:      titleMatch?.[1] || '',
        description: '', reason: '', severity: 'normal', objects: [],
      }
    } else {
      console.warn('[Gemini Vision] Could not parse response JSON:', rawText)
      throw new Error('Gemini returned unparseable JSON')
    }
  }

  // Sanitise and normalise all fields
  const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other'
  const priority = ['High', 'Medium', 'Low'].includes(parsed.priority) ? parsed.priority : 'Medium'
  const severity = ['normal', 'high', 'critical'].includes(parsed.severity) ? parsed.severity : 'normal'
  const confidence = Math.min(Math.max(Number(parsed.confidence) || 0.7, 0), 1)

  const detectedObjects = (parsed.objects || []).map((name) => ({
    name,
    confidence: 0.9,
    source: 'gemini',
  }))

  return {
    category,
    priority,
    severity,
    confidence,
    title: parsed.title || '',
    description: parsed.description || '',
    reason: parsed.reason || '',
    detectedObjects,
    allScores: [{ category, score: confidence }],
    method: 'gemini',
    isSafeContent: severity !== 'critical',
    analyzedAt: new Date(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT-BASED CLASSIFICATION  (no image needed — primary path for Option 3)
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_CLASSIFICATION_PROMPT = `You are a campus maintenance complaint classifier for Velalar College of Engineering and Technology (VCET), Erode, Tamil Nadu, India.
A student has described a maintenance issue in plain English (or Tamil-English mix). Classify it accurately.

Categories (pick exactly one):
- Electrical: lights, fans, switches, sockets, wiring, power outage, bulbs, tube lights, switchboards, electric shock
- Plumbing: water supply, pipes, taps, leaks, drains, toilets, bathrooms, seepage, flooding
- Furniture: chairs, tables, desks, benches, doors, windows, cupboards, lockers, hinges, broken fixtures
- Cleanliness: dirty areas, garbage, smell, pests, cockroaches, rats, mosquitoes, not cleaned, mold
- AC/Ventilation: air conditioner, exhaust fans, ventilation, hot rooms, no cooling, HVAC
- Internet/WiFi: WiFi, internet, network, LAN, router, slow connection, no signal
- Infrastructure: walls, ceilings, floors, roof, tiles, paint, plaster, cracks, steps, railings
- Security: locks, CCTV, gates, fire safety, access control, broken locks
- Other: anything that doesn't fit above

Priority rules:
- High: safety hazard (electrical risk, fire, flooding, structural collapse risk, health emergency)
- Medium: essential service not working, significant disruption to studies/stay
- Low: cosmetic issue, minor inconvenience, slow service

Common Indian/Tamil-English patterns to recognise:
- "light not coming / light gone / no light" → Electrical
- "current not coming / current problem / no current" → Electrical
- "water not coming / no water / water problem" → Plumbing
- "wifi not working / net not working / no internet" → Internet/WiFi
- "not cleaned / dirty / smell problem" → Cleanliness
- "wall cracking / seepage / plaster falling" → Infrastructure

Reply ONLY with minified JSON — no markdown, no code block, no explanation:
{"category":"...","priority":"High|Medium|Low","confidence":0.0,"title":"5-8 word specific title","reason":"one sentence"}`

/**
 * Classify a student's complaint description using Gemini text model.
 * Called automatically when keyword confidence < 0.65 (Option 3 hybrid flow).
 *
 * @param {string} text - Student's description of the issue
 * @returns {Promise<{category, priority, confidence, title, reason, method}>}
 */
export const classifyWithGeminiText = async (text) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set')

  const safeText = text.replace(/"/g, "'").slice(0, 800)

  const payload = {
    contents: [
      {
        parts: [
          { text: TEXT_CLASSIFICATION_PROMPT + '\n\nStudent description: "' + safeText + '"' },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
      // Suppress thinking tokens so they don't truncate the JSON output.
      // Part filtering in the response parser handles any residual thought parts.
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  // Text classification is real-time — fail fast on 429 (quota/rate-limit), skip to next model immediately
  const tryModel = async (model) => {
    if (_dailyExhausted.has(model)) {
      console.warn(`[Gemini Text] ${model} — daily quota exhausted (cached), skipping`)
      return null
    }
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.status === 429) {
      const body = await res.text()
      if (body.includes('PerDay')) {
        _dailyExhausted.add(model)
        console.warn(`[Gemini Text] ${model} daily quota exhausted — skipping for this session`)
      } else {
        console.warn(`[Gemini Text] ${model} quota/rate-limit — skipping to next model`)
      }
      return { ok: false, status: 429, _body: body }
    }
    return res
  }

  let response, lastError
  for (const model of GEMINI_TEXT_MODELS) {
    const res = await tryModel(model)
    if (!res) continue
    if (res.ok) { console.log(`[Gemini Text] ✓ Using ${model}`); response = res; break }
    lastError = res._body ?? await res.text()
    console.warn(`[Gemini Text] ${model} failed (${res.status}):`, lastError)
  }

  if (!response) throw new Error(`All Gemini models failed. Last error: ${lastError}`)

  const data = await response.json()
  // gemini-2.5-flash thinking model: parts[0] may be the 'thought' content.
  // Filter to only non-thought parts to get the actual JSON output.
  const parts = data?.candidates?.[0]?.content?.parts || []
  const rawText = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim()
    || parts.map(p => p.text || '').join('').trim()

  const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    // Partial JSON fallback: regex-extract fields from truncated response.
    // Use [^",}\n]+ (no closing quote required) to handle hard-truncated strings like
    //   {"category":"Plumbing   ← no closing quote because output was cut off.
    const catMatch  = rawText.match(/"category"\s*:\s*"([^",}\n]+)/)
    const prioMatch = rawText.match(/"priority"\s*:\s*"([^",}\n]+)/)
    const confMatch = rawText.match(/"confidence"\s*:\s*([\d.]+)/)
    const titleMatch = rawText.match(/"title"\s*:\s*"([^"\n]{3,})/)
    if (catMatch?.[1]) {
      console.warn('[Gemini Text] Partial JSON recovered from truncated response')
      parsed = {
        category:   catMatch[1],
        priority:   prioMatch?.[1]  || 'Medium',
        confidence: confMatch ? parseFloat(confMatch[1]) : 0.75,
        title:      titleMatch?.[1] || '',
        reason:     '',
      }
    } else {
      console.warn('[Gemini Text] Could not parse response JSON:', rawText)
      throw new Error('Gemini returned unparseable JSON')
    }
  }

  const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other'
  const priority = ['High', 'Medium', 'Low'].includes(parsed.priority) ? parsed.priority : 'Medium'
  const confidence = Math.min(Math.max(Number(parsed.confidence) || 0.75, 0), 1)

  return {
    category,
    priority,
    confidence,
    title:          parsed.title  || '',
    reason:         parsed.reason || '',
    detectedObjects: [],
    allScores:      [{ category, score: confidence }],
    method:         'gemini_text',
  }
}

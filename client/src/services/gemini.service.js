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

// Models available on the free tier via v1beta
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
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

const SYSTEM_PROMPT = `Classify this campus maintenance image. Reply ONLY with JSON, no markdown.
Categories: ${VALID_CATEGORIES.join(', ')}
Priority: High (safety hazard/failure), Medium (significant malfunction), Low (cosmetic/minor)
{"category":"...","priority":"...","confidence":0.0,"reason":"one sentence","objects":["..."]}`

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
      maxOutputTokens: 150,
    },
  }

  // Helper: call one model, auto-retry once on 429 after the suggested delay
  const tryModel = async (model) => {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`
    console.log(`[Gemini] Trying model: ${model}`)

    const attempt = async () => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    let res = await attempt()
    if (res.status === 429) {
      const errJson = await res.clone().json().catch(() => null)
      const retrySeconds = errJson?.error?.details?.find(d => d.retryDelay)?.retryDelay
      const waitMs = retrySeconds ? (parseInt(retrySeconds) + 1) * 1000 : 20000
      console.warn(`[Gemini] ${model} rate-limited — retrying in ${waitMs / 1000}s`)
      await new Promise(r => setTimeout(r, waitMs))
      res = await attempt()
    }
    return res
  }

  let response, lastError
  for (const model of GEMINI_MODELS) {
    const res = await tryModel(model)
    if (res.ok) { console.log(`[Gemini] ✓ Using ${model}`); response = res; break }
    lastError = await res.text()
    console.warn(`[Gemini] ${model} failed (${res.status}):`, lastError)
  }

  if (!response) throw new Error(`All Gemini models failed. Last error: ${lastError}`)

  const data = await response.json()
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Strip any accidental markdown fences
  const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    console.warn('[Gemini] Could not parse response JSON:', rawText)
    throw new Error('Gemini returned unparseable JSON')
  }

  // Sanitise category — fall back to Other if model hallucinated something
  const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other'
  const priority = ['High', 'Medium', 'Low'].includes(parsed.priority) ? parsed.priority : 'Medium'
  const confidence = Math.min(Math.max(Number(parsed.confidence) || 0.7, 0), 1)

  const detectedObjects = (parsed.objects || []).map((name) => ({
    name,
    confidence: 0.9,
    source: 'gemini',
  }))

  return {
    category,
    priority,
    confidence,
    reason: parsed.reason || '',
    detectedObjects,
    allScores: [{ category, score: confidence }],
    method: 'gemini',
    isSafeContent: true,
    analyzedAt: new Date(),
  }
}

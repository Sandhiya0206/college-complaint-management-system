/**
 * xAI Grok Vision API — image classification for campus complaint categories
 * Uses grok-2-vision-1212 (OpenAI-compatible chat completions with vision)
 * Docs: https://docs.x.ai/docs/guides/vision
 */

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions'
const GROK_MODEL   = 'grok-2-vision-1212'

const VALID_CATEGORIES = [
  'Electrical', 'Plumbing', 'Furniture', 'Cleanliness',
  'Internet/WiFi', 'Infrastructure', 'Security', 'AC/Ventilation', 'Other',
]

const SYSTEM_PROMPT = `You are a campus maintenance classifier. Analyse the image and reply ONLY with valid JSON — no markdown, no prose outside the JSON.

Categories: ${VALID_CATEGORIES.join(', ')}
Priority rules:
- High   → safety hazard (fire, flood, exposed wires, broken glass, sewage overflow) or complete service failure
- Medium → significant damage / malfunction affecting daily use
- Low    → cosmetic or minor issue (dust, worn paint, slight scratch)

Required JSON format:
{"category":"<one of the categories>","priority":"High"|"Medium"|"Low","confidence":<0.0-1.0>,"reason":"<one concise sentence>","objects":["<thing1>","<thing2>"]}`

/**
 * Resize + compress image to max 768px JPEG before encoding.
 * Keeps payload small → faster response.
 */
const resizeAndEncode = (file) =>
  new Promise((resolve, reject) => {
    const MAX = 768
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.80)
      resolve(dataUrl) // full data URL — Grok accepts "data:image/jpeg;base64,..."
    }
    img.onerror = reject
    img.src = url
  })

/**
 * Classify an image using xAI Grok Vision.
 * @param {File} file
 * @returns {Promise<{category, priority, confidence, reason, detectedObjects, allScores, method}>}
 */
export const classifyWithGrok = async (file) => {
  const apiKey = import.meta.env.VITE_GROK_API_KEY
  if (!apiKey) throw new Error('VITE_GROK_API_KEY is not set')

  const dataUrl = await resizeAndEncode(file)
  console.log(`[Grok] Image compressed → ${(dataUrl.length * 0.75 / 1024).toFixed(0)} KB`)

  const payload = {
    model: GROK_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
          { type: 'text',      text: SYSTEM_PROMPT },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 200,
  }

  const response = await fetch(GROK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Grok API error ${response.status}: ${errBody}`)
  }

  const data = await response.json()
  const rawText = data?.choices?.[0]?.message?.content || ''
  console.log('[Grok] Raw response:', rawText)

  // Strip accidental markdown fences
  const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    console.warn('[Grok] Could not parse JSON:', rawText)
    throw new Error('Grok returned unparseable JSON')
  }

  const category   = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other'
  const priority   = ['High', 'Medium', 'Low'].includes(parsed.priority) ? parsed.priority : 'Medium'
  const confidence = Math.min(Math.max(Number(parsed.confidence) || 0.75, 0), 1)

  const detectedObjects = (parsed.objects || []).map(name => ({
    name, confidence: 0.9, source: 'grok',
  }))

  return {
    category, priority, confidence,
    reason: parsed.reason || '',
    detectedObjects,
    allScores: [{ category, score: confidence }],
    method: 'grok',
    isSafeContent: true,
    analyzedAt: new Date(),
  }
}

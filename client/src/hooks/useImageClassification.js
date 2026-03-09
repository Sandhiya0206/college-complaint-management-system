import { useState, useRef, useCallback } from 'react'
import { mapPredictionsToCategory, calculatePriority, analyzeText } from '../utils/aiMapper'

// ── Singleton model cache (loaded once per session) ──────────────────────────
let mobilenetModel = null
let cocoSsdModel   = null
let modelsLoadingPromise = null

const loadModels = () => {
  if (mobilenetModel && cocoSsdModel) return Promise.resolve()
  if (modelsLoadingPromise) return modelsLoadingPromise

  modelsLoadingPromise = (async () => {
    const tf        = await import('@tensorflow/tfjs')
    const mobilenet = await import('@tensorflow-models/mobilenet')
    const cocoSsd   = await import('@tensorflow-models/coco-ssd')
    await tf.ready()
    const [mn, coco] = await Promise.all([
      mobilenet.load({ version: 2, alpha: 1.0 }),
      cocoSsd.load(),
    ])
    mobilenetModel = mn
    cocoSsdModel   = coco
    console.log('[AI] TF.js models loaded (MobileNetV2 + COCO-SSD)')
  })()

  return modelsLoadingPromise
}

export const useImageClassification = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const imgRef = useRef(null)

  // ── Keyword fallback (no external deps, instant) ─────────────────────────
  const classifyWithKeywords = (file) => {
    const hint = analyzeText(file.name.replace(/[_\-.]/g, ' '))
    return hint
      ? { ...hint, method: 'keyword_fallback', isSafeContent: true, analyzedAt: new Date() }
      : { category: 'Other', priority: 'Medium', confidence: 0.3, detectedObjects: [], allScores: [], method: 'keyword_fallback', isSafeContent: true, analyzedAt: new Date() }
  }

  // ── Main entry point ─────────────────────────────────────────────────────
  const analyzeImage = useCallback(async (file) => {
    if (!file || import.meta.env.VITE_AI_ENABLED !== 'true') return null

    setIsAnalyzing(true)
    setError(null)
    setResult(null)
    setAnalysisStep(0)

    try {
      let analysisResult

      try {
        // Step 1 — Load TF.js models (cached after first load)
        setAnalysisStep(1)
        await loadModels()

        // Step 2 — Decode image into an HTMLImageElement
        setAnalysisStep(2)
        const imgEl = new Image()
        const objectUrl = URL.createObjectURL(file)
        await new Promise((resolve, reject) => {
          imgEl.onload = resolve
          imgEl.onerror = reject
          imgEl.src = objectUrl
        })

        // Step 3 — MobileNetV2 top-5 predictions
        setAnalysisStep(3)
        const predictions = await mobilenetModel.classify(imgEl)

        // Step 4 — COCO-SSD object detection
        setAnalysisStep(4)
        const detections = await cocoSsdModel.detect(imgEl)
        URL.revokeObjectURL(objectUrl)

        // Step 5 — Map labels → campus category + priority
        setAnalysisStep(5)
        const { category, confidence, detectedObjects, allScores } = mapPredictionsToCategory(predictions, detections)
        const priority = calculatePriority(category, confidence, detectedObjects)

        analysisResult = {
          category,
          priority,
          confidence,
          detectedObjects,
          allScores,
          detectedLabels: predictions.slice(0, 5).map(p => ({ label: p.className, confidence: p.probability })),
          method: 'tensorflow',
          isSafeContent: true,
          analyzedAt: new Date(),
        }

        console.log('[AI/TFjs] →', category, '|', priority, `| ${(confidence * 100).toFixed(1)}%`)
      } catch (tfErr) {
        console.error('[AI] TF.js failed:', tfErr.message)
        setError(`TF.js error — using keyword fallback: ${tfErr.message}`)
        analysisResult = classifyWithKeywords(file)
      }

      setResult(analysisResult)
      return analysisResult
    } catch (err) {
      console.error('Image classification error:', err)
      setError(err.message || 'Analysis failed')
      const fallback = { category: 'Other', priority: 'Medium', confidence: 0.3, detectedObjects: [], allScores: [], method: 'keyword_fallback', isSafeContent: true }
      setResult(fallback)
      return fallback
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setAnalysisStep(0)
    setIsAnalyzing(false)
  }, [])

  return { analyzeImage, isAnalyzing, analysisStep, result, error, reset }
}

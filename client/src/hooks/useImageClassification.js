import { useState, useCallback } from 'react'
import { analyzeText } from '../utils/aiMapper'
import { classifyWithCLIP, loadClipModel } from '../services/localAI.service'

export const useImageClassification = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [modelDownloadProgress, setModelDownloadProgress] = useState(0) // 0–100, only during first download
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // ── Keyword fallback (instant, no model needed) ─────────────────────────
  const classifyWithKeywords = (file) => {
    const hint = analyzeText(file.name.replace(/[_\-.]/g, ' '))
    return hint
      ? { ...hint, title: '', description: '', severity: 'normal', method: 'keyword_fallback', isSafeContent: true, analyzedAt: new Date() }
      : { category: 'Other', priority: 'Medium', confidence: 0.3, title: '', description: '', severity: 'normal', detectedObjects: [], allScores: [], method: 'keyword_fallback', isSafeContent: true, analyzedAt: new Date() }
  }

  // ── Main entry point ─────────────────────────────────────────────────────
  // Priority chain: CLIP (local) → keyword fallback on failure
  const analyzeImage = useCallback(async (file) => {
    if (!file) return null

    setIsAnalyzing(true)
    setError(null)
    setResult(null)
    setAnalysisStep(0)
    setModelDownloadProgress(0)

    try {
      let analysisResult

      // ── CLIP local model (free, offline, no limits) ─────────────────────
      try {
        setAnalysisStep(1)
        const clipResult = await classifyWithCLIP(file, ({ progress }) => {
          setModelDownloadProgress(progress)
        })
        setAnalysisStep(3)
        analysisResult = {
          ...clipResult,
          detectedLabels: clipResult.objects?.map(label => ({ label, confidence: clipResult.confidence })) || [],
          allScores: [{ category: clipResult.category, score: clipResult.confidence }],
        }
        console.log('[AI/CLIP] →', analysisResult.category, '|', analysisResult.priority, `| ${(analysisResult.confidence * 100).toFixed(1)}%`)
      } catch (clipErr) {
        throw clipErr // fall through to keyword fallback below
      }

      setResult(analysisResult)
      return analysisResult
    } catch (err) {
      // ── Last resort: keyword fallback ───────────────────────────────────────
      console.error('[AI] All AI methods failed, using keyword fallback:', err.message)
      setError('AI analysis unavailable — using filename keywords')
      const fallback = classifyWithKeywords(file)
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
    setModelDownloadProgress(0)
    setIsAnalyzing(false)
  }, [])

  // Pre-warm: start loading CLIP model in the background as soon as the hook mounts
  // so it's ready when the user picks an image
  const preloadModel = useCallback(() => {
    loadClipModel().catch(() => {}) // silently ignore pre-warm errors
  }, [])

  return { analyzeImage, isAnalyzing, analysisStep, modelDownloadProgress, result, error, reset, preloadModel }
}

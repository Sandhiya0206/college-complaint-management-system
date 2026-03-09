import { useState } from 'react'
import { Sparkles, Copy, Check, X, Wand2 } from 'lucide-react'
import { workerService } from '../../services/worker.service'

/**
 * AIDraftModal
 * Props:
 *   complaintId – string
 *   onUse       – (text: string) => void
 *   onClose     – () => void
 */
export default function AIDraftModal({ complaintId, onUse, onClose }) {
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [edited, setEdited] = useState('')
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await workerService.getAIDraft(complaintId)
      setDraft(res.draft)
      setEdited(res.draft)
      setGenerated(true)
    } catch (e) {
      setError('Failed to generate draft. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(edited)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-purple-500/30 bg-gradient-to-br from-gray-900 to-purple-950/30 shadow-2xl shadow-purple-900/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15">
              <Wand2 className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">AI Draft Generator</h3>
              <p className="text-xs text-white/40">Feature #9</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!generated ? (
            <>
              <p className="text-sm text-white/60">
                Generate a professional status update message for this complaint using AI context about the issue, location, and priority.
              </p>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                onClick={generate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/40"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate AI Draft
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/50 uppercase tracking-wide">Generated Draft</label>
                  <button onClick={copy} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <textarea
                  value={edited}
                  onChange={(e) => setEdited(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/60 text-white/80 text-sm resize-none outline-none transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onUse?.(edited)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all"
                >
                  <Check className="w-4 h-4" />
                  Use This Draft
                </button>
                <button
                  onClick={() => setGenerated(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-white/60 text-sm transition-all"
                >
                  Regenerate
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

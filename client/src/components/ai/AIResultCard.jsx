import { Brain, Sparkles, Edit2, Zap, Wifi, Cloud } from 'lucide-react'
import { getCategoryIcon, getConfidenceColor } from '../../utils/helpers'
import ConfidenceBar from '../common/ConfidenceBar'
import PriorityBadge from '../common/PriorityBadge'

const METHOD_META = {
  grok:                { label: 'Grok Vision AI',    pill: 'bg-rose-100 text-rose-700 border-rose-200' },
  gemini:              { label: 'Gemini Vision AI',  pill: 'bg-blue-100 text-blue-700 border-blue-200' },
  tensorflow:          { label: 'TensorFlow.js',     pill: 'bg-violet-100 text-violet-700 border-violet-200' },
  tensorflow_fallback: { label: 'TF.js (fallback)',  pill: 'bg-amber-100 text-amber-700 border-amber-200' },
  hybrid:              { label: 'Hybrid AI',         pill: 'bg-teal-100 text-teal-700 border-teal-200' },
  keyword_fallback:    { label: 'Keyword Match',     pill: 'bg-gray-100 text-gray-600 border-gray-200' },
  text_analysis:       { label: 'Text Analysis',     pill: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const AIResultCard = ({ result, onOverride }) => {
  if (!result) return null

  const { category, priority, confidence, detectedObjects = [], allScores = [], method, reason } = result
  const colors = getConfidenceColor(confidence)
  const icon = getCategoryIcon(category)
  const confidencePct = Math.round((confidence || 0) * 100)
  const meta = METHOD_META[method] || { label: method || 'AI', pill: 'bg-gray-100 text-gray-600 border-gray-200' }

  return (
    <div className={`border-2 ${colors.border} ${colors.bg} rounded-xl p-4 animate-slide-up`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <Brain size={14} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold text-violet-700 flex items-center gap-1">
              <Sparkles size={11} /> AI Detection Result
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 mt-0.5 ${meta.pill}`}>
              {meta.label}
            </span>
          </div>
        </div>
        <span className={`text-xs font-bold ${colors.text} px-2 py-0.5 rounded-full bg-white/50`}>
          {confidencePct}% confidence
        </span>
      </div>

      {/* Category & Priority */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-3xl">{icon}</div>
        <div>
          <div className="font-bold text-gray-900 text-base">{category}</div>
          <div className="mt-0.5"><PriorityBadge priority={priority} /></div>
        </div>
      </div>

      {/* Confidence bar */}
      <ConfidenceBar confidence={confidence} className="mb-3" />

      {/* Gemini reason */}
      {reason && (
        <div className="mb-3 text-[11px] text-gray-600 bg-white/60 rounded-lg px-3 py-2 border border-gray-100 italic">
          "{reason}"
        </div>
      )}

      {/* Runner-up categories */}
      {allScores?.length > 1 && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Also considered</div>
          <div className="flex flex-wrap gap-1">
            {allScores.slice(1).map((s, i) => (
              <span key={i} className="text-[10px] bg-white/70 border border-gray-200 rounded-full px-2 py-0.5 text-gray-500">
                {getCategoryIcon(s.category)} {s.category}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detected objects */}
      {detectedObjects.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Detected in image</div>
          <div className="flex flex-wrap gap-1">
            {detectedObjects.slice(0, 6).map((obj, i) => (
              <span key={i} className={`text-[10px] rounded-full px-2 py-0.5 border ${
                obj.source === 'grok'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : obj.source === 'gemini'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : obj.source === 'coco-ssd'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white/70 border-gray-200 text-gray-600'
              }`}>
                {obj.name}{(obj.source !== 'grok' && obj.source !== 'gemini') ? ` ${Math.round((obj.confidence || 0) * 100)}%` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Override button */}
      {onOverride && (
        <button
          onClick={onOverride}
          className="w-full mt-1 text-xs flex items-center justify-center gap-1.5 py-1.5 border border-violet-300 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors font-medium"
        >
          <Edit2 size={11} />
          Change Category (Override AI)
        </button>
      )}
    </div>
  )
}

export default AIResultCard
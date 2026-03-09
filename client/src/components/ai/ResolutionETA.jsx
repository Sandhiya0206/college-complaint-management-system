import { Clock, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react'

/**
 * ResolutionETA
 * Props:
 *   etaHours     – number
 *   etaConfidence – 0-1
 *   etaBasedOn   – string label
 *   compact      – boolean
 */
export default function ResolutionETA({ etaHours, etaConfidence, etaBasedOn, compact = false }) {
  if (!etaHours) return null

  const formatTime = (hrs) => {
    if (hrs < 1) return `${Math.round(hrs * 60)} min`
    if (hrs < 24) return `${hrs.toFixed(1)} hrs`
    const d = Math.floor(hrs / 24)
    const h = Math.round(hrs % 24)
    return h > 0 ? `${d}d ${h}h` : `${d} day${d > 1 ? 's' : ''}`
  }

  const confidencePct = Math.round((etaConfidence || 0.5) * 100)
  const isHighConf = confidencePct >= 75
  const trendIcon = isHighConf
    ? <TrendingUp className="w-4 h-4 text-emerald-400" />
    : <Minus className="w-4 h-4 text-yellow-400" />

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
        <Clock className="w-3.5 h-3.5" />
        ETA ~{formatTime(etaHours)}
      </span>
    )
  }

  return (
    <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/50 to-indigo-950/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-blue-500/10">
          <Zap className="w-4 h-4 text-blue-400" />
        </div>
        <span className="text-white/80 text-sm font-medium">AI Resolution Estimate</span>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold text-white">{formatTime(etaHours)}</span>
        <span className="text-white/40 text-sm mb-1">estimated</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-white/50">
          {trendIcon}
          <span>{etaBasedOn || 'Based on similar complaints'}</span>
        </div>
        <span className={`font-medium ${isHighConf ? 'text-emerald-400' : 'text-yellow-400'}`}>
          {isHighConf ? '✓' : '~'} {confidencePct}% confidence
        </span>
      </div>
    </div>
  )
}

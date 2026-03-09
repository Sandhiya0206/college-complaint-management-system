import { CheckCircle, AlertCircle, XCircle, ShieldCheck } from 'lucide-react'

/**
 * GenuinenessIndicator
 * Props:
 *   score   – 0-100
 *   verdict – 'genuine' | 'review' | 'suspicious'
 *   flags   – string[]
 *   compact – boolean (show only badge, no details)
 */
export default function GenuinenessIndicator({ score, verdict, flags = [], compact = false }) {
  if (score === undefined || score === null) return null

  const config = {
    genuine:    { color: 'emerald', Icon: CheckCircle,  label: 'Genuine',    bg: 'from-emerald-950/60 to-green-950/60',   border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    review:     { color: 'yellow',  Icon: AlertCircle,  label: 'Needs Review', bg: 'from-yellow-950/60 to-amber-950/60',  border: 'border-yellow-500/40',  text: 'text-yellow-300',  badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'  },
    suspicious: { color: 'red',     Icon: XCircle,      label: 'Suspicious', bg: 'from-red-950/60 to-rose-950/60',        border: 'border-red-500/40',     text: 'text-red-300',     badge: 'bg-red-500/20 text-red-300 border-red-500/30'           },
  }
  const c = config[verdict] || config.review
  const { Icon } = c

  const barColor = verdict === 'genuine' ? 'bg-emerald-500' : verdict === 'review' ? 'bg-yellow-500' : 'bg-red-500'

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.badge}`}>
        <Icon className="w-3.5 h-3.5" />
        AI: {c.label} ({score})
      </span>
    )
  }

  return (
    <div className={`rounded-xl border p-4 bg-gradient-to-r ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-white/5`}>
            <ShieldCheck className={`w-4 h-4 ${c.text}`} />
          </div>
          <span className="text-white/80 text-sm font-medium">AI Genuineness Analysis</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.badge}`}>
          <Icon className="w-3.5 h-3.5" />
          {c.label}
        </span>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/50 mb-1">
          <span>Authenticity Score</span>
          <span className={c.text}>{score}/100</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {flags.length > 0 && (
        <div>
          <p className="text-xs text-white/40 mb-1.5 uppercase tracking-wide">Flags detected</p>
          <div className="flex flex-wrap gap-1.5">
            {flags.map((f, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/60 border border-white/10">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

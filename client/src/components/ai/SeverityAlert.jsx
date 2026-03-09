import { useEffect, useState } from 'react'
import { AlertTriangle, Zap, Flame, ShieldAlert } from 'lucide-react'

/* Client-side pattern matching mirrors severityEscalation.service.js */
const CRITICAL_PATTERNS = [
  /gas\s*leak/i, /electrical\s*(shock|fire)/i, /structure[d\s]*crack/i,
  /flood/i, /electrocut/i, /burst\s*pipe/i, /roof\s*(collapse|fall)/i,
  /fire\s*(broke|spread)/i, /smoke\s*(everywhere|filling)/i
]
const HIGH_PATTERNS = [
  /\bleak/i, /broken\s*glass/i, /no\s*(water|power|electricity)/i,
  /pest/i, /exposed\s*wire/i, /spark/i, /\bsmoke\b/i
]

const analyse = (text) => {
  if (!text) return { level: 'normal', signals: [] }
  const found = []
  for (const p of CRITICAL_PATTERNS) {
    const m = text.match(p)
    if (m) found.push({ level: 'critical', phrase: m[0] })
  }
  for (const p of HIGH_PATTERNS) {
    const m = text.match(p)
    if (m) found.push({ level: 'high', phrase: m[0] })
  }
  if (found.some(f => f.level === 'critical')) return { level: 'critical', signals: found.map(f => f.phrase) }
  if (found.some(f => f.level === 'high')) return { level: 'high', signals: found.map(f => f.phrase) }
  return { level: 'normal', signals: [] }
}

export default function SeverityAlert({ text = '' }) {
  const [result, setResult] = useState({ level: 'normal', signals: [] })

  useEffect(() => {
    const id = setTimeout(() => setResult(analyse(text)), 300)
    return () => clearTimeout(id)
  }, [text])

  if (result.level === 'normal') return null

  const isCritical = result.level === 'critical'

  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 animate-fade-in ${
      isCritical
        ? 'bg-gradient-to-r from-red-950/60 to-rose-950/60 border-red-500/60'
        : 'bg-gradient-to-r from-orange-950/60 to-amber-950/60 border-orange-500/60'
    }`}>
      {/* Animated pulse ring */}
      <span className={`absolute top-3 right-3 flex h-3 w-3`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCritical ? 'bg-red-400' : 'bg-orange-400'}`} />
        <span className={`relative inline-flex rounded-full h-3 w-3 ${isCritical ? 'bg-red-500' : 'bg-orange-500'}`} />
      </span>

      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-1.5 rounded-lg ${isCritical ? 'bg-red-500/20' : 'bg-orange-500/20'}`}>
          {isCritical
            ? <Flame className="w-5 h-5 text-red-400" />
            : <AlertTriangle className="w-5 h-5 text-orange-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${isCritical ? 'text-red-300' : 'text-orange-300'}`}>
            {isCritical
              ? '🚨 CRITICAL Safety Issue Detected'
              : '⚠️ High-Severity Issue Detected'
            }
          </p>
          <p className="text-xs text-white/60 mt-0.5">
            {isCritical
              ? 'This complaint will be auto-escalated and admins will be notified immediately.'
              : 'This issue has been flagged for priority handling.'
            }
          </p>
          {result.signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[...new Set(result.signals)].slice(0, 5).map((s, i) => (
                <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isCritical ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                }`}>
                  <ShieldAlert className="w-3 h-3" />
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

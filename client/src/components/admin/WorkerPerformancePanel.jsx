import { useState, useEffect } from 'react'
import {
  Users, Star, Clock, TrendingDown, Award, AlertTriangle,
  RefreshCw, CheckCircle2, XCircle, Activity, BarChart2, Zap
} from 'lucide-react'
import { adminService } from '../../services/admin.service'

const GRADE_CONFIG = {
  A: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', label: 'Excellent' },
  B: { bg: 'bg-blue-500/20',    text: 'text-blue-300',    border: 'border-blue-500/40',    label: 'Good' },
  C: { bg: 'bg-yellow-500/20',  text: 'text-yellow-300',  border: 'border-yellow-500/40',  label: 'Average' },
  D: { bg: 'bg-red-500/20',     text: 'text-red-300',     border: 'border-red-500/40',     label: 'Underperforming' },
}

function ScoreRing({ score }) {
  const pct = Math.max(0, Math.min(100, score || 0))
  const r = 22, C = 2 * Math.PI * r
  const dash = (pct / 100) * C
  const color = pct >= 75 ? '#34d399' : pct >= 50 ? '#60a5fa' : pct >= 30 ? '#fbbf24' : '#f87171'
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="26" cy="26" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${C}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.7s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{pct}</span>
    </div>
  )
}

function WorkerCard({ p, anomaly }) {
  const g = GRADE_CONFIG[p.grade] || GRADE_CONFIG.C
  return (
    <div className={`rounded-2xl border p-4 bg-gradient-to-br from-gray-900/80 to-gray-800/40 transition-all ${
      anomaly ? 'border-red-500/50 shadow-lg shadow-red-900/20' : 'border-white/10 hover:border-white/20'
    }`}>
      {/* Anomaly banner */}
      {anomaly && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-300">
            <span className="font-semibold">{anomaly.severity === 'critical' ? '🔴 Critical drop' : '🟡 Performance drop'}</span>
            {' '}— score fell by {Math.round(anomaly.drop)} pts in 7 days
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <ScoreRing score={p.score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white text-sm truncate">{p.name}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${g.bg} ${g.text} ${g.border}`}>
              {p.grade}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-0.5 truncate">{p.department || 'General'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-yellow-400 mb-0.5">
            <Star className="w-3 h-3 fill-current" />
            <span className="text-xs font-semibold">{(p.avgRating || 0).toFixed(1)}</span>
          </div>
          <p className="text-xs text-white/30">Rating</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-blue-400 mb-0.5">
            <CheckCircle2 className="w-3 h-3" />
            <span className="text-xs font-semibold">{Math.round(p.resolutionRate || 0)}%</span>
          </div>
          <p className="text-xs text-white/30">Resolved</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-red-400 mb-0.5">
            <Zap className="w-3 h-3" />
            <span className="text-xs font-semibold">{Math.round(p.slaBreach || 0)}%</span>
          </div>
          <p className="text-xs text-white/30">SLA breach</p>
        </div>
      </div>
    </div>
  )
}

export default function WorkerPerformancePanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('score')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await adminService.getWorkerPerformance()
      setData(res)
    } catch (e) {
      setError('Failed to load worker performance data.')
    } finally {
      setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const anomalyMap = {}
  data?.anomalies?.forEach(a => { anomalyMap[a.workerId?.toString()] = a })

  const sorted = [...(data?.performance || [])].sort((a, b) => {
    if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
    if (sortBy === 'rating') return (b.avgRating || 0) - (a.avgRating || 0)
    if (sortBy === 'breach') return (a.slaBreach || 0) - (b.slaBreach || 0)
    return 0
  })

  const anomalyCount = data?.anomalies?.length || 0

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-4">
      <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
      <span className="text-white/40 text-sm">Loading worker metrics…</span>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center py-16 gap-3">
      <AlertTriangle className="w-8 h-8 text-red-400" />
      <p className="text-white/50 text-sm">{error}</p>
      <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm transition-all">Retry</button>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600/25 to-indigo-600/25 border border-blue-500/30">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Worker Performance</h2>
            <p className="text-xs text-white/40">AI anomaly detection · Feature #6</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 hover:bg-white/5 text-white/60 hover:text-white text-xs transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Anomaly alert */}
      {anomalyCount > 0 && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/8 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">
              {anomalyCount} Worker{anomalyCount > 1 ? 's' : ''} flagged for performance anomalies
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              These workers have seen a significant drop in score compared to their 30-day baseline.
            </p>
          </div>
        </div>
      )}

      {/* Sort controls */}
      <div className="flex gap-2">
        {[['score', 'Overall Score'], ['rating', 'Rating'], ['breach', 'SLA Compliance']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setSortBy(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sortBy === v ? 'bg-blue-600 text-white' : 'border border-white/15 text-white/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Grade legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(GRADE_CONFIG).map(([g, c]) => (
          <span key={g} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${c.bg} ${c.text} ${c.border}`}>
            <Award className="w-3 h-3" /> {g} — {c.label}
          </span>
        ))}
      </div>

      {/* Worker grid */}
      {sorted.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((p, idx) => (
            <WorkerCard key={p.workerId?.toString() || p.name || idx} p={p} anomaly={anomalyMap[p.workerId?.toString()]} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-white/30">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No worker performance data yet</p>
        </div>
      )}
    </div>
  )
}

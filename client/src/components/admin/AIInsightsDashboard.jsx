import { useState, useEffect } from 'react'
import {
  Brain, TrendingUp, TrendingDown, Minus, Flame, MapPin,
  Wrench, AlertTriangle, RefreshCw, BarChart3, Activity,
  Building2, Layers, ChevronRight
} from 'lucide-react'
import { adminService } from '../../services/admin.service'

const CATEGORY_COLORS = {
  Electrical:       { bg: 'bg-yellow-500/20', text: 'text-yellow-300',  dot: 'bg-yellow-400' },
  Plumbing:         { bg: 'bg-blue-500/20',   text: 'text-blue-300',    dot: 'bg-blue-400' },
  Furniture:        { bg: 'bg-orange-500/20', text: 'text-orange-300',  dot: 'bg-orange-400' },
  Cleanliness:      { bg: 'bg-green-500/20',  text: 'text-green-300',   dot: 'bg-green-400' },
  Infrastructure:   { bg: 'bg-purple-500/20', text: 'text-purple-300',  dot: 'bg-purple-400' },
  'AC/Ventilation': { bg: 'bg-cyan-500/20',   text: 'text-cyan-300',    dot: 'bg-cyan-400' },
  'Internet/WiFi':  { bg: 'bg-indigo-500/20', text: 'text-indigo-300',  dot: 'bg-indigo-400' },
  Security:         { bg: 'bg-red-500/20',    text: 'text-red-300',     dot: 'bg-red-400' },
  Other:            { bg: 'bg-gray-500/20',   text: 'text-gray-300',    dot: 'bg-gray-400' },
}

const defaultColor = { bg: 'bg-violet-500/20', text: 'text-violet-300', dot: 'bg-violet-400' }

function StatCard({ icon: Icon, label, value, sub, colorClass = 'text-violet-400', bgClass = 'from-violet-950/40 to-purple-950/40', border = 'border-violet-500/30' }) {
  return (
    <div className={`rounded-2xl border p-4 bg-gradient-to-br ${bgClass} ${border} flex items-start gap-3`}>
      <div className="p-2.5 rounded-xl bg-white/5 mt-0.5">
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <div>
        <p className="text-white/50 text-xs">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function HotspotCard({ spot, rank }) {
  const cc = CATEGORY_COLORS[spot._id?.category] || defaultColor
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors">
      <span className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-white/40 shrink-0">
        #{rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{spot._id?.location || 'Unknown'}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cc.bg} ${cc.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cc.dot}`} />
            {spot._id?.category}
          </span>
          {spot._id?.hostelBlock && (
            <span className="text-xs text-white/30">{spot._id.hostelBlock}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-base font-bold text-white">{spot.count}</p>
        <p className="text-xs text-white/30">complaints</p>
      </div>
    </div>
  )
}

function RepeatLocationCard({ loc, rank }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/12 transition-colors">
      <div className="p-1.5 rounded-lg bg-amber-500/15 mt-0.5 shrink-0">
        <MapPin className="w-4 h-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{loc._id?.location}</p>
        {loc._id?.category && <p className="text-xs text-white/40 mt-0.5">{loc._id.category}</p>}
      </div>
      <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
        {loc.count}×
      </span>
    </div>
  )
}

function MaintenanceSuggestion({ s, i }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8">
      <div className="p-1.5 rounded-lg bg-emerald-500/15 mt-0.5 shrink-0">
        <Wrench className="w-4 h-4 text-emerald-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-white/80 font-medium">{s.location}</p>
        <p className="text-xs text-white/50 mt-0.5">{s.suggestion}</p>
        <p className="text-xs text-emerald-400/70 mt-1">Referred {s.count} times · {s.category}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 shrink-0 mt-1" />
    </div>
  )
}

function CategoryBar({ row }) {
  const cc = CATEGORY_COLORS[row._id] || defaultColor
  const highPct = row.total > 0 ? Math.round((row.highCount / row.total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cc.dot}`} />
          <span className="text-white/70">{row._id}</span>
        </div>
        <div className="flex items-center gap-3">
          {highPct > 0 && <span className="text-red-400">{highPct}% high</span>}
          <span className="font-semibold text-white">{row.total}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${cc.dot}`} style={{ width: `${Math.min((row.total / 20) * 100, 100)}%` }} />
      </div>
    </div>
  )
}

export default function AIInsightsDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminService.getAIInsights()
      setData(res)
      setLastRefresh(new Date())
    } catch (e) {
      setError('Failed to load AI insights. Make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const TrendIcon = data?.forecast?.trend === 'up'
    ? TrendingUp : data?.forecast?.trend === 'down' ? TrendingDown : Minus
  const trendColor = data?.forecast?.trend === 'up'
    ? 'text-red-400' : data?.forecast?.trend === 'down' ? 'text-emerald-400' : 'text-yellow-400'

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Brain className="w-7 h-7 text-purple-400 animate-pulse" />
        </div>
      </div>
      <p className="text-white/50 text-sm">Analysing complaint patterns…</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <AlertTriangle className="w-10 h-10 text-red-400" />
      <p className="text-white/60 text-sm">{error}</p>
      <button onClick={load} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">
        Retry
      </button>
    </div>
  )

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-600/30 to-violet-600/30 border border-purple-500/30">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">AI Insights Dashboard</h2>
            <p className="text-xs text-white/40">Predictive analytics · Features #3, #14</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 hover:bg-white/5 text-white/60 hover:text-white text-xs transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Forecast row */}
      {data.forecast && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={BarChart3}
            label="Next Week Forecast"
            value={data.forecast.forecast ?? '—'}
            sub={`vs ${data.forecast.lastWeek} last week`}
            colorClass="text-purple-400"
            bgClass="from-purple-950/50 to-violet-950/40"
            border="border-purple-500/30"
          />
          <StatCard
            icon={TrendIcon}
            label="Volume Trend"
            value={data.forecast.trend ? data.forecast.trend.toUpperCase() : '—'}
            sub={`${Math.round((data.forecast.confidence || 0) * 100)}% confidence`}
            colorClass={trendColor}
            bgClass="from-gray-900/60 to-gray-800/30"
            border="border-white/10"
          />
          <StatCard
            icon={Flame}
            label="Active Hotspots"
            value={data.hotspots?.length ?? 0}
            sub="locations with recurring issues"
            colorClass="text-orange-400"
            bgClass="from-orange-950/40 to-red-950/30"
            border="border-orange-500/25"
          />
          <StatCard
            icon={MapPin}
            label="Repeat Locations"
            value={data.repeatLocations?.length ?? 0}
            sub="needing permanent fix"
            colorClass="text-amber-400"
            bgClass="from-amber-950/40 to-yellow-950/30"
            border="border-amber-500/25"
          />
        </div>
      )}

      {/* Middle grid: hotspots + category trend */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Hotspots */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-white">Complaint Hotspots</h3>
          </div>
          <div className="space-y-2">
            {data.hotspots?.length > 0
              ? data.hotspots.map((s, i) => <HotspotCard key={i} spot={s} rank={i + 1} />)
              : <p className="text-white/30 text-sm text-center py-6">No hotspots detected yet</p>
            }
          </div>
        </div>

        {/* Category trend */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Category Breakdown (7 days)</h3>
          </div>
          <div className="space-y-3">
            {data.categoryTrend?.length > 0
              ? data.categoryTrend.map((row, i) => <CategoryBar key={i} row={row} />)
              : <p className="text-white/30 text-sm text-center py-6">No category data</p>
            }
          </div>
        </div>
      </div>

      {/* Bottom grid: repeat locations + maintenance suggestions */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Repeat locations (Feature #14) */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Repeat Offender Locations</h3>
          </div>
          <p className="text-xs text-white/30 mb-4">Locations with 3+ complaints in 30 days (Feature #14)</p>
          <div className="space-y-2">
            {data.repeatLocations?.length > 0
              ? data.repeatLocations.map((loc, i) => <RepeatLocationCard key={i} loc={loc} rank={i + 1} />)
              : <p className="text-white/30 text-sm text-center py-6">No repeat offender locations</p>
            }
          </div>
        </div>

        {/* Maintenance suggestions (Feature #3) */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Maintenance Suggestions</h3>
          </div>
          <p className="text-xs text-white/30 mb-4">AI-recommended preventive actions (Feature #3)</p>
          <div className="space-y-2">
            {data.maintenanceSuggestions?.length > 0
              ? data.maintenanceSuggestions.map((s, i) => <MaintenanceSuggestion key={i} s={s} i={i} />)
              : <p className="text-white/30 text-sm text-center py-6">No suggestions available</p>
            }
          </div>
        </div>
      </div>

      {lastRefresh && (
        <p className="text-xs text-white/20 text-center">Last updated: {lastRefresh.toLocaleTimeString()}</p>
      )}
    </div>
  )
}

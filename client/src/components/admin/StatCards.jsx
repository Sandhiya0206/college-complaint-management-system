import { TrendingUp, TrendingDown, Minus, AlertTriangle, Flame } from 'lucide-react'

const TrendIcon = ({ trend }) => {
  if (trend > 0) return <TrendingUp size={12} className="text-red-500" />
  if (trend < 0) return <TrendingDown size={12} className="text-green-500" />
  return <Minus size={12} className="text-gray-400" />
}

const StatCards = ({ stats }) => {
  if (!stats) return null

  const todayTrend = (stats.todayNewCount ?? 0) - (stats.yesterdayNewCount ?? 0)

  const cards = [
    {
      label: 'Total Complaints',
      value: stats.total ?? 0,
      sub: `${stats.todayNewCount ?? 0} new today`,
      trend: todayTrend,
      color: 'border-l-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      ring: 'ring-blue-100',
      icon: '',
    },
    {
      label: 'Pending Review',
      value: (stats.byStatus?.Submitted ?? 0) + (stats.byStatus?.Assigned ?? 0),
      sub: `${stats.byStatus?.Submitted ?? 0} unassigned`,
      color: 'border-l-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      ring: 'ring-amber-100',
      icon: '',
    },
    {
      label: 'Escalated',
      value: stats.escalatedCount ?? 0,
      sub: 'require attention',
      color: 'border-l-red-500',
      bg: 'bg-red-50',
      text: 'text-red-600',
      ring: 'ring-red-100',
      iconComponent: <AlertTriangle size={20} className="text-red-500" />,
    },
    {
      label: 'Resolved',
      value: stats.byStatus?.Resolved ?? 0,
      sub: `${stats.resolutionRate ?? 0}% resolution rate`,
      color: 'border-l-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      ring: 'ring-emerald-100',
      icon: '',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className={`stat-card border-l-4 ${c.color} animate-fade-in-up`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{c.label}</p>
              <p className="text-3xl font-black text-gray-900 mt-1 tabular-nums">{c.value}</p>
              <div className={`flex items-center gap-1 text-xs mt-1 ${c.text} font-medium`}>
                {c.sub}
                {c.trend !== undefined && (
                  <span className="flex items-center gap-0.5 ml-1">
                    <TrendIcon trend={c.trend} />
                    <span className={c.trend > 0 ? 'text-red-500' : c.trend < 0 ? 'text-green-500' : 'text-gray-400'}>
                      {c.trend > 0 ? `+${c.trend}` : c.trend}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <div className={`text-2xl p-2.5 ${c.bg} rounded-xl ring-1 ${c.ring} flex items-center justify-center`}>
              {c.iconComponent ? c.iconComponent : c.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatCards

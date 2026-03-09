import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getCategoryIcon } from '../../utils/helpers'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981']

const WorkerStats = ({ stats }) => {
  if (!stats) return null

  const {
    assigned = 0,
    completedTotal = 0,
    inProgress = 0,
    completedToday = 0,
    categoryBreakdown = [],
  } = stats

  const donutData = [
    { name: 'Resolved', value: completedTotal },
    { name: 'In Progress', value: inProgress },
    { name: 'Pending', value: Math.max(0, assigned) },
  ].filter(d => d.value > 0)

  const completionRate = (assigned + completedTotal) > 0
    ? Math.round((completedTotal / (assigned + completedTotal)) * 100)
    : 0

  const DONUT_COLORS = ['#22c55e', '#6366f1', '#f59e0b']

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Completion Donut */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Completion Overview</h3>
        <div className="flex items-center gap-4">
          <div className="relative w-28 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" paddingAngle={2}>
                  {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-gray-900">{Math.round(completionRate)}%</span>
              <span className="text-[10px] text-gray-400">rate</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {donutData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i] }} />
                <span className="text-gray-500">{d.name}:</span>
                <span className="font-semibold text-gray-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-500 text-center">
          Resolved today: <span className="font-semibold text-gray-700">{completedToday}</span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">By Category</h3>
        {categoryBreakdown.length > 0 ? (
          <div className="space-y-2">
            {categoryBreakdown.slice(0, 5).map((c, i) => (
              <div key={c._id} className="flex items-center gap-2">
                <span className="text-base w-5">{getCategoryIcon(c._id)}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600 truncate">{c._id}</span>
                    <span className="font-medium text-gray-800">{c.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${completedTotal > 0 ? (c.count / completedTotal) * 100 : 0}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
        )}
      </div>
    </div>
  )
}

export default WorkerStats

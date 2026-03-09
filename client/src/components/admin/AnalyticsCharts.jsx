import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts'
import { getCategoryIcon } from '../../utils/helpers'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981']

const AnalyticsCharts = ({ stats }) => {
  if (!stats) return null

  const categoryData = Object.entries(stats.byCategory || {}).map(([name, value]) => ({ name, value }))
  const statusData = Object.entries(stats.byStatus || {}).map(([name, value]) => ({ name, value }))
  const priorityData = Object.entries(stats.byPriority || {}).map(([name, value]) => ({ name, value }))
  const workerData = (stats.workerWorkload || []).map(w => ({
    name: w.name?.split(' ')[0] || w._id,
    active: w.activeCount,
    resolved: w.resolvedCount,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* By Category */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Complaints by Category</h3>
        <div className="flex gap-4 items-center">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={28} outerRadius={50} dataKey="value" paddingAngle={2}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5">
            {categoryData.slice(0, 5).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-gray-600 flex-1 truncate">{getCategoryIcon(d.name)} {d.name}</span>
                <span className="font-semibold text-gray-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By Status */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Distribution</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={statusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Worker Workload */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Worker Workload</h3>
        {workerData.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={workerData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="active" fill="#6366f1" radius={[4, 4, 0, 0]} name="Active" />
              <Bar dataKey="resolved" fill="#22c55e" radius={[4, 4, 0, 0]} name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-gray-400 text-center py-8">No worker data</p>}
      </div>

      {/* Priority */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Priority Breakdown</h3>
        <div className="space-y-3">
          {priorityData.map((p, i) => {
            const total = priorityData.reduce((s, d) => s + d.value, 0)
            const pct = total ? Math.round((p.value / total) * 100) : 0
            const color = p.name === 'High' ? '#ef4444' : p.name === 'Medium' ? '#f59e0b' : '#22c55e'
            return (
              <div key={p.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{p.name}</span>
                  <span className="font-semibold text-gray-800">{p.value} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsCharts

import { useState } from 'react'
import { Filter, X, ChevronDown } from 'lucide-react'

const STATUSES = ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Rejected']
const PRIORITIES = ['High', 'Medium', 'Low']
const CATEGORIES = ['Electrical', 'Plumbing', 'Furniture', 'Cleanliness', 'Internet & WiFi', 'Civil', 'Security', 'Water Supply', 'Other']

const ComplaintFilters = ({ filters, onChange, onClear }) => {
  const [showPanel, setShowPanel] = useState(false)

  const hasActive = Object.values(filters).some(v => v && v !== '')

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(p => !p)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
          hasActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
        }`}
      >
        <Filter size={14} />
        Filters
        {hasActive && <span className="bg-white text-indigo-600 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
          {Object.values(filters).filter(v => v && v !== '').length}
        </span>}
        <ChevronDown size={14} className={`transition-transform ${showPanel ? 'rotate-180' : ''}`} />
      </button>

      {showPanel && (
        <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Filter Complaints</span>
            <button onClick={() => { onClear(); setShowPanel(false) }} className="text-xs text-red-500 hover:underline">Clear all</button>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Status</p>
            <div className="flex flex-wrap gap-1">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => onChange({ ...filters, status: filters.status === s ? '' : s })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filters.status === s ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Priority</p>
            <div className="flex gap-1">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => onChange({ ...filters, priority: filters.priority === p ? '' : p })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filters.priority === p ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Category</p>
            <select
              className="input-field text-sm"
              value={filters.category || ''}
              onChange={e => onChange({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button onClick={() => setShowPanel(false)} className="btn-primary w-full text-sm">Apply</button>
        </div>
      )}
    </div>
  )
}

export default ComplaintFilters

import { useState, useEffect } from 'react'
import { complaintService } from '../../services/complaint.service'
import ComplaintCard from './ComplaintCard'
import ComplaintDetailModal from './ComplaintDetailModal'
import EmptyState from '../common/EmptyState'
import LoadingSpinner from '../common/LoadingSpinner'
import { Search, SortAsc } from 'lucide-react'

const STATUSES = ['All', 'Submitted', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Completed', 'Rejected']
const PRIORITIES = ['All', 'High', 'Medium', 'Low']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'priority', label: 'Priority' },
]

const ComplaintList = ({ refreshTrigger, complaints: externalComplaints }) => {
  const [complaints, setComplaints] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (externalComplaints) {
      setComplaints(externalComplaints)
      setIsLoading(false)
      return
    }
    loadComplaints()
  }, [refreshTrigger, externalComplaints])

  const loadComplaints = async () => {
    setIsLoading(true)
    try {
      const params = {}
      if (activeFilter && activeFilter !== 'All') params.status = activeFilter
      if (search) params.search = search
      const data = await complaintService.getMyComplaints(params)
      setComplaints(data.complaints || [])
    } catch (err) {
      console.error('Failed to load complaints:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!externalComplaints) loadComplaints()
  }, [activeFilter, search])

  const filtered = complaints.filter(c => {
    if (activeFilter && activeFilter !== 'All' && c.status !== activeFilter) return false
    if (priorityFilter && priorityFilter !== 'All' && c.priority !== priorityFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return c.complaintId?.toLowerCase().includes(s) || c.location?.toLowerCase().includes(s) || c.category?.toLowerCase().includes(s)
    }
    return true
  })

  const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt)
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt)
    if (sortBy === 'priority') return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
    return 0
  })

  return (
    <div className="space-y-4">
      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input-field pl-8 text-sm"
            placeholder="Search by ID, location or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <SortAsc size={14} className="text-gray-400" />
          <select className="input-field text-sm py-1.5 pr-8" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setActiveFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
              activeFilter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'text-gray-600 border-gray-300 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Priority filters */}
      <div className="flex gap-1.5 flex-wrap">
        {PRIORITIES.map(p => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
              priorityFilter === p
                ? p === 'High' ? 'bg-red-600 text-white border-red-600'
                  : p === 'Medium' ? 'bg-amber-500 text-white border-amber-500'
                  : p === 'Low' ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-600 text-white border-gray-600'
                : 'text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSpinner text="Loading complaints..." />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No complaints found"
          description={activeFilter !== `All` ? `No ${activeFilter} complaints` : "You have not submitted any complaints yet."}
        />
      ) : (
        <div className="space-y-3">
          {sorted.map(c => (
            <ComplaintCard key={c._id} complaint={c} onClick={() => setSelectedId(c._id)} />
          ))}
        </div>
      )}

      {selectedId && (
        <ComplaintDetailModal complaintId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

export default ComplaintList

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { adminService } from '../../services/admin.service'
import StatCards from './StatCards'
import AnalyticsCharts from './AnalyticsCharts'
import ComplaintTable from './ComplaintTable'
import ComplaintFilters from './ComplaintFilters'
import ComplaintDetailModal from './ComplaintDetailModal'
import WorkerManagement from './WorkerManagement'
import AdminEscalatedPage from './AdminEscalatedPage'
import BulkAssignModal from './BulkAssignModal'
import EditComplaintModal from './EditComplaintModal'
import LoadingSpinner from '../common/LoadingSpinner'
import AIInsightsDashboard from './AIInsightsDashboard'
import WorkerPerformancePanel from './WorkerPerformancePanel'
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates'
import { Search, Users, LayoutDashboard, ClipboardList, RefreshCw, ShieldCheck, AlertTriangle, CheckSquare, Pencil, Trash2, Brain, BarChart3 } from 'lucide-react'
import { toast } from 'react-toastify'

const TABS = [
  { id: 'overview',         label: 'Overview',      icon: LayoutDashboard },
  { id: 'complaints',       label: 'Complaints',    icon: ClipboardList   },
  { id: 'escalated',        label: 'Escalated',     icon: AlertTriangle   },
  { id: 'workers',          label: 'Workers',       icon: Users           },
  { id: 'ai-insights',      label: 'AI Insights',   icon: Brain           },
  { id: 'worker-perf',      label: 'Performance',   icon: BarChart3       },
]

const AdminDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [workers, setWorkers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' })
  const [detailId, setDetailId] = useState(null)
  const [newIds] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  useRealTimeUpdates()

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (activeTab === 'complaints') loadComplaints() }, [filters, search, activeTab])

  const loadAll = async () => {
    setIsLoading(true)
    try {
      const [sData, cData, wData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAllComplaints({ limit: 50 }),
        adminService.getWorkers(),
      ])
      setStats(sData.stats)
      setComplaints(cData.complaints || [])
      setWorkers(wData.workers || [])
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  const loadComplaints = async () => {
    try {
      const params = { limit: 100, ...filters }
      if (search) params.search = search
      const data = await adminService.getAllComplaints(params)
      setComplaints(data.complaints || [])
    } catch (e) { console.error(e) }
  }

  const handleUpdated = () => { loadAll(); setDetailId(null) }
  const clearFilters = () => setFilters({ status: '', priority: '', category: '' })

  const toggleSelect = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )
  const toggleSelectAll = () => setSelectedIds(
    selectedIds.length === complaints.length ? [] : complaints.map(c => c._id)
  )

  const handleSoftDelete = async (id) => {
    if (!window.confirm('Archive this complaint? It will be hidden from all views.')) return
    try {
      await adminService.softDeleteComplaint(id)
      toast.success('Complaint archived')
      loadComplaints()
    } catch (e) {
      toast.error(e.message || 'Failed to archive')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/80">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 to-violet-800 p-6 text-white shadow-lg shadow-purple-200">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-32 w-28 h-28 bg-violet-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 flex-shrink-0">
                <ShieldCheck size={28} className="text-white" />
              </div>
              <div>
                <p className="text-purple-200 text-sm font-medium">Administrator</p>
                <h1 className="text-2xl font-black tracking-tight">{user?.name || 'Admin'}</h1>
                <p className="text-purple-200 text-sm mt-0.5">
                  {stats
                    ? `${stats.total ?? 0} total complaints · ${stats.byStatus?.Submitted ?? 0} pending review`
                    : 'Loading stats…'}
                </p>
              </div>
            </div>
            <button
              onClick={loadAll}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all active:scale-95 backdrop-blur-sm"
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-2xl shadow-sm w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-200'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : (
          <>
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <StatCards stats={stats} />
                <AnalyticsCharts stats={stats} />
                <div className="card">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-50 rounded-lg"><ClipboardList size={15} className="text-purple-600" /></div>
                      <h2 className="font-bold text-gray-900">Recent Complaints</h2>
                    </div>
                    <button onClick={() => setActiveTab('complaints')} className="text-xs text-purple-600 hover:text-purple-700 font-semibold hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors">
                      View all →
                    </button>
                  </div>
                  <ComplaintTable complaints={complaints.slice(0, 8)} onRowClick={setDetailId} newIds={newIds} />
                </div>
              </div>
            )}

            {/* COMPLAINTS */}
            {activeTab === 'complaints' && (
              <div className="card space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-50 rounded-lg"><ClipboardList size={15} className="text-purple-600" /></div>
                    <h2 className="font-bold text-gray-900">All Complaints</h2>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{complaints.length}</span>
                  </div>
                  <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                      <button
                        onClick={() => setShowBulkAssign(true)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        <CheckSquare size={12} /> Bulk Assign ({selectedIds.length})
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input-field pl-8 text-sm"
                      placeholder="Search by ID, title, location…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <ComplaintFilters filters={filters} onChange={setFilters} onClear={clearFilters} />
                </div>

                {/* Bulk select header */}
                {complaints.length > 0 && (
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === complaints.length && complaints.length > 0}
                        onChange={toggleSelectAll}
                        className="accent-indigo-600"
                      />
                      {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
                    </label>
                  </div>
                )}

                {/* Complaint rows with edit/delete + checkbox */}
                <div className="space-y-1">
                  {complaints.map(c => (
                    <div key={c._id} className={`flex items-center gap-2 rounded-xl px-2 hover:bg-gray-50 transition-colors ${selectedIds.includes(c._id) ? 'bg-indigo-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c._id)}
                        onChange={() => toggleSelect(c._id)}
                        className="accent-indigo-600 flex-shrink-0"
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="flex-1 cursor-pointer" onClick={() => setDetailId(c._id)}>
                        <ComplaintTable complaints={[c]} onRowClick={setDetailId} newIds={newIds} />
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => setEditTarget(c)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleSoftDelete(c._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Archive"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ESCALATED */}
            {activeTab === 'escalated' && (
              <AdminEscalatedPage />
            )}

            {/* WORKERS */}
            {activeTab === 'workers' && (
              <WorkerManagement workers={workers} onRefresh={loadAll} />
            )}

            {/* AI INSIGHTS (Feature #3, #14) */}
            {activeTab === 'ai-insights' && (
              <AIInsightsDashboard />
            )}

            {/* WORKER PERFORMANCE (Feature #6) */}
            {activeTab === 'worker-perf' && (
              <WorkerPerformancePanel />
            )}
          </>
        )}
      </div>

      {detailId && (
        <ComplaintDetailModal complaintId={detailId} onClose={() => setDetailId(null)} onUpdated={handleUpdated} />
      )}

      {showBulkAssign && (
        <BulkAssignModal
          selectedIds={selectedIds}
          workers={workers}
          onClose={() => setShowBulkAssign(false)}
          onSuccess={() => { setShowBulkAssign(false); setSelectedIds([]); loadComplaints() }}
        />
      )}

      {editTarget && (
        <EditComplaintModal
          complaint={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); loadComplaints() }}
        />
      )}
    </div>
  )
}

export default AdminDashboard

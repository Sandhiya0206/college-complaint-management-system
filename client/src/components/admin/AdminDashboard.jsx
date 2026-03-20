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
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard, color: '#a78bfa' },
  { id: 'complaints',  label: 'Complaints',  icon: ClipboardList,   color: '#818cf8' },
  { id: 'escalated',   label: 'Escalated',   icon: AlertTriangle,   color: '#f87171' },
  { id: 'workers',     label: 'Workers',     icon: Users,           color: '#34d399' },
  { id: 'ai-insights', label: 'Insights',    icon: Brain,           color: '#c084fc' },
  { id: 'worker-perf', label: 'Performance', icon: BarChart3,       color: '#fb923c' },
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

  const activeTabMeta = TABS.find(t => t.id === activeTab)

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f6f3ee 0%, #faf8f4 45%, #f2efe9 100%)' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(124,58,237,0.34) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle, #ede9fe, #ddd6fe)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[80px] opacity-10"
          style={{ background: 'radial-gradient(circle, #fee2e2, #fecaca)' }} />
        {/* Hex grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(167,139,250,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* â”€â”€ Command Center Header â”€â”€ */}
        <div className="relative overflow-hidden rounded-3xl p-7"
          style={{ background: 'linear-gradient(140deg, rgba(255,255,255,0.98) 0%, rgba(244,239,255,0.95) 55%, rgba(255,255,255,0.99) 100%)', border: '1px solid rgba(167,139,250,0.28)', boxShadow: '0 16px 42px rgba(124,58,237,0.16)' }}>
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-violet-300/25 blur-3xl" />
          <div className="absolute bottom-0 left-40 w-36 h-36 rounded-full bg-fuchsia-300/20 blur-2xl" />
          {/* Circuit pattern */}
          <div className="absolute top-0 right-0 w-40 h-full opacity-[0.1]">
            <svg viewBox="0 0 160 100" fill="none" className="w-full h-full">
              <path d="M20 20 H80 V50 H140" stroke="#7c3aed" strokeWidth="1"/>
              <path d="M20 60 H60 V30 H100 V70 H140" stroke="#7c3aed" strokeWidth="1"/>
              <circle cx="80" cy="50" r="3" fill="#7c3aed"/>
              <circle cx="60" cy="60" r="3" fill="#7c3aed"/>
              <circle cx="100" cy="70" r="3" fill="#7c3aed"/>
            </svg>
          </div>

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.35)', boxShadow: '0 8px 20px rgba(124,58,237,0.2)' }}>
                <ShieldCheck size={30} className="text-violet-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-violet-700 text-sm font-semibold">Command Center</span>
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                    🛡️ Admin
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">{user?.name || 'Admin'}</h1>
                <p className="text-slate-600 text-sm mt-0.5">
                  {stats
                    ? `${stats.total ?? 0} total · ${stats.byStatus?.Submitted ?? 0} awaiting review · ${workers.length} workers online`
                    : 'Loading system data...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {stats && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Open', val: (stats.byStatus?.Submitted ?? 0) + (stats.byStatus?.Assigned ?? 0) },
                    { label: 'Resolved', val: stats.byStatus?.Resolved ?? 0 },
                  ].map(s => (
                    <div key={s.label} className="text-center px-4 py-2.5 rounded-xl bg-white/80 border border-violet-200">
                      <div className="text-xl font-black text-slate-900">{s.val}</div>
                      <div className="text-[10px] text-violet-700 font-semibold uppercase tracking-wide">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={loadAll}
                className="flex items-center gap-2 font-bold text-sm px-4 py-3 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.34)', color: '#6d28d9' }}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* â”€â”€ Tab bar â”€â”€ */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-200 hover:scale-105"
              style={activeTab === id
                ? { background: `linear-gradient(135deg, ${color}30, ${color}20)`, color, border: `1px solid ${color}50`, boxShadow: `0 4px 15px ${color}30` }
                : { background: 'rgba(255,255,255,0.92)', color: '#475569', border: '1px solid rgba(15,23,42,0.08)' }
              }
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24"><LoadingSpinner /></div>
        ) : (
          <>
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <StatCards stats={stats} />
                <AnalyticsCharts stats={stats} />
                <div className="rounded-3xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(167,139,250,0.2)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
                  <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(167,139,250,0.1)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
                        <ClipboardList size={15} style={{ color: '#a78bfa' }} />
                      </div>
                      <h2 className="font-black text-slate-900">Recent Complaints</h2>
                    </div>
                    <button onClick={() => setActiveTab('complaints')}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                      style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                      View all →
                    </button>
                  </div>
                  <div className="p-4">
                    <ComplaintTable complaints={complaints.slice(0, 8)} onRowClick={setDetailId} newIds={newIds} />
                  </div>
                </div>
              </div>
            )}

            {/* COMPLAINTS */}
            {activeTab === 'complaints' && (
              <div className="rounded-3xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(129,140,248,0.18)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
                <div className="p-6 border-b space-y-4" style={{ borderColor: 'rgba(129,140,248,0.1)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.25)' }}>
                        <ClipboardList size={15} style={{ color: '#818cf8' }} />
                      </div>
                      <h2 className="font-black text-slate-900">All Complaints</h2>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>{complaints.length}</span>
                    </div>
                    {selectedIds.length > 0 && (
                      <button
                        onClick={() => setShowBulkAssign(true)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold"
                        style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                        <CheckSquare size={12} /> Bulk Assign ({selectedIds.length})
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
                      <input
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border text-slate-800 placeholder-slate-400 focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.96)', borderColor: 'rgba(15,23,42,0.1)', outline: 'none' }}
                        placeholder="Search by ID, title, location..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                    <ComplaintFilters filters={filters} onChange={setFilters} onClear={clearFilters} />
                  </div>
                </div>
                <div className="p-4">
                  {complaints.length > 0 && (
                    <div className="flex items-center gap-2 pb-3 border-b mb-3" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
                      <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                        <input type="checkbox"
                          checked={selectedIds.length === complaints.length && complaints.length > 0}
                          onChange={toggleSelectAll} className="accent-violet-500" />
                        {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
                      </label>
                    </div>
                  )}
                  <div className="space-y-1">
                    {complaints.map(c => (
                      <div key={c._id} className={`flex items-center gap-2 rounded-xl px-2 transition-colors ${selectedIds.includes(c._id) ? 'bg-violet-500/10' : 'hover:bg-slate-100/80'}`}>
                        <input type="checkbox" checked={selectedIds.includes(c._id)} onChange={() => toggleSelect(c._id)}
                          className="accent-violet-500 flex-shrink-0" onClick={e => e.stopPropagation()} />
                        <div className="flex-1 cursor-pointer" onClick={() => setDetailId(c._id)}>
                          <ComplaintTable complaints={[c]} onRowClick={setDetailId} newIds={newIds} />
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => setEditTarget(c)}
                            className="p-1.5 rounded-lg transition-colors" style={{ color: '#64748b' }}
                            onMouseEnter={e => { e.currentTarget.style.color='#a78bfa'; e.currentTarget.style.background='rgba(167,139,250,0.1)' }}
                            onMouseLeave={e => { e.currentTarget.style.color='#64748b'; e.currentTarget.style.background='transparent' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleSoftDelete(c._id)}
                            className="p-1.5 rounded-lg transition-colors" style={{ color: '#64748b' }}
                            onMouseEnter={e => { e.currentTarget.style.color='#f87171'; e.currentTarget.style.background='rgba(248,113,113,0.1)' }}
                            onMouseLeave={e => { e.currentTarget.style.color='#64748b'; e.currentTarget.style.background='transparent' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ESCALATED */}
            {activeTab === 'escalated' && <AdminEscalatedPage />}

            {/* WORKERS */}
            {activeTab === 'workers' && <WorkerManagement workers={workers} onRefresh={loadAll} />}

            {/* AI INSIGHTS */}
            {activeTab === 'ai-insights' && <AIInsightsDashboard />}

            {/* WORKER PERFORMANCE */}
            {activeTab === 'worker-perf' && <WorkerPerformancePanel />}
          </>
        )}
      </div>

      {detailId && (
        <ComplaintDetailModal complaintId={detailId} onClose={() => setDetailId(null)} onUpdated={handleUpdated} />
      )}
      {showBulkAssign && (
        <BulkAssignModal selectedIds={selectedIds} workers={workers}
          onClose={() => setShowBulkAssign(false)}
          onSuccess={() => { setShowBulkAssign(false); setSelectedIds([]); loadComplaints() }} />
      )}
      {editTarget && (
        <EditComplaintModal complaint={editTarget} onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); loadComplaints() }} />
      )}
    </div>
  )
}

export default AdminDashboard


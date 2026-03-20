import { useState, useEffect, useCallback } from 'react'
import { workerService } from '../../services/worker.service'
import AssignedComplaintCard from './AssignedComplaintCard'
import WorkerStats from './WorkerStats'
import ComplaintDetailModal from './ComplaintDetailModal'
import UpdateStatusModal from './UpdateStatusModal'
import EmptyState from '../common/EmptyState'
import LoadingSpinner from '../common/LoadingSpinner'
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { SOCKET_EVENTS } from '../../utils/constants'
import { ClipboardList, Zap, CheckCircle2, BarChart3, RefreshCw, Wrench, Star, TrendingUp } from 'lucide-react'

const WorkerDashboard = () => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [detailId, setDetailId] = useState(null)
  const [resolveTarget, setResolveTarget] = useState(null)

  useRealTimeUpdates()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch active (Assigned/In Progress/On Hold) and resolved in two calls.
      // Do NOT separately fetch On Hold — it is already included in the first
      // call (status not in [Resolved, Rejected]), which previously caused
      // On Hold entries to appear twice → duplicate key React warning.
      const [activeData, resolvedData, sData] = await Promise.all([
        workerService.getAssignedComplaints({ limit: 100 }),
        workerService.getAssignedComplaints({ status: 'Resolved', limit: 100 }),
        workerService.getStats(),
      ])
      setComplaints([
        ...(activeData.complaints || []),
        ...(resolvedData.complaints || []),
      ])
      setStats(sData.stats)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Real-time refresh: socket events ──────────────────────────────────────
  // Listen to COMPLAINT_ASSIGNED, STATUS_CHANGED, WORKER_REASSIGNED.
  // Also listen to the socket 'connect' event so that any events missed during
  // a socket drop are recovered the moment the socket reconnects.
  useEffect(() => {
    if (!socket) return
    const refresh = () => loadData()
    socket.on('connect', refresh)                          // recover missed events on (re)connect
    socket.on('worker_complaints_sync', refresh)           // server pushes on connect if tasks pending
    socket.on(SOCKET_EVENTS.COMPLAINT_ASSIGNED, refresh)
    socket.on(SOCKET_EVENTS.STATUS_CHANGED, refresh)
    socket.on(SOCKET_EVENTS.WORKER_REASSIGNED, refresh)
    return () => {
      socket.off('connect', refresh)
      socket.off('worker_complaints_sync', refresh)
      socket.off(SOCKET_EVENTS.COMPLAINT_ASSIGNED, refresh)
      socket.off(SOCKET_EVENTS.STATUS_CHANGED, refresh)
      socket.off(SOCKET_EVENTS.WORKER_REASSIGNED, refresh)
    }
  }, [socket, loadData])

  // ── Polling fallback — catches anything the socket missed entirely ─────────
  // Runs every 30 s regardless of socket state.
  useEffect(() => {
    const interval = setInterval(() => loadData(), 30_000)
    return () => clearInterval(interval)
  }, [loadData])

  // ── Tab visibility refresh ── refetch when worker switches back to this tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [loadData])

  const handleStartWork = async (id) => {
    try {
      await workerService.startWork(id)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleResolved = () => {
    setResolveTarget(null)
    loadData()
  }

  const active = complaints.filter(c => ['Assigned', 'In Progress', 'On Hold'].includes(c.status))
  const resolved = complaints.filter(c => c.status === 'Resolved')

  const statCards = [
    { label: 'Total Assigned', value: stats?.assigned ?? 0,        icon: <ClipboardList size={18} />, accent: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)' },
    { label: 'In Progress',    value: stats?.inProgress ?? 0,       icon: <Zap size={18} />,           accent: '#06b6d4', bg: 'rgba(6,182,212,0.12)',    border: 'rgba(6,182,212,0.25)'  },
    { label: 'Resolved Today', value: stats?.completedToday ?? 0,   icon: <CheckCircle2 size={18} />,  accent: '#34d399', bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.25)' },
    { label: 'Total Resolved', value: stats?.completedTotal ?? 0,   icon: <TrendingUp size={18} />,    accent: '#a3e635', bg: 'rgba(163,230,53,0.12)',   border: 'rgba(163,230,53,0.25)' },
  ]

  const performanceScore = stats?.completedTotal > 0
    ? Math.min(100, Math.round((stats.completedTotal / Math.max(stats.assigned ?? 1, stats.completedTotal)) * 100))
    : 0

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f6f3ee 0%, #f8fbf8 38%, #f1efe8 100%)' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.35) 1px, transparent 1px)',
          backgroundSize: '36px 36px'
        }} />
        <div className="absolute -top-20 right-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-15"
          style={{ background: 'radial-gradient(circle, #dcfce7, #bbf7d0)' }} />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] rounded-full blur-[80px] opacity-10"
          style={{ background: 'radial-gradient(circle, #fef3c7, #fde68a)' }} />
        {/* Tool pattern */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(52,211,153,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.4) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Field Ops Header ── */}
        <div className="relative overflow-hidden rounded-3xl p-7"
          style={{ background: 'linear-gradient(140deg, rgba(255,255,255,0.98) 0%, rgba(236,253,245,0.98) 52%, rgba(255,255,255,0.99) 100%)', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 16px 42px rgba(5,150,105,0.16)' }}>
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-emerald-300/25 blur-3xl" />
          <div className="absolute bottom-0 left-36 w-32 h-32 rounded-full bg-teal-300/20 blur-2xl" />
          {/* Tool icons pattern */}
          <div className="absolute top-4 right-6 opacity-[0.14] text-5xl select-none">⚙️</div>
          <div className="absolute bottom-4 right-16 opacity-[0.14] text-3xl select-none">🔧</div>

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.32)', boxShadow: '0 8px 20px rgba(5,150,105,0.2)' }}>
                <Wrench size={28} className="text-emerald-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-700 text-sm font-semibold">Field Operations</span>
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    🔧 Worker
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">{user?.name}</h1>
                <p className="text-slate-600 text-sm mt-0.5">
                  {user?.department} Department · {active.length} active task{active.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Performance ring */}
              <div className="text-center px-5 py-3 rounded-2xl bg-white/80 border border-emerald-200 backdrop-blur-sm">
                <div className="text-2xl font-black text-slate-900">{performanceScore}%</div>
                <div className="flex items-center gap-1 justify-center mt-0.5">
                  <Star size={9} className="text-amber-300 fill-amber-300" />
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wide">Score</span>
                </div>
              </div>
              <button onClick={loadData}
                className="flex items-center gap-2 font-bold text-sm px-4 py-3 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#047857' }}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label}
              className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default"
              style={{ background: 'rgba(255,255,255,0.94)', border: `1px solid ${s.border}`, backdropFilter: 'blur(12px)', boxShadow: '0 10px 26px rgba(15,23,42,0.08)' }}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-30 -translate-y-4 translate-x-4"
                style={{ background: s.accent }} />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <span style={{ color: s.accent }}>{s.icon}</span>
                </div>
                <div className="text-3xl font-black text-slate-900 tabular-nums">{s.value}</div>
                <div className="text-xs font-semibold mt-0.5 uppercase tracking-wide" style={{ color: s.accent }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats charts */}
        {stats && <WorkerStats stats={stats} />}

        {/* ── Tasks panel ── */}
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(16,185,129,0.2)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
          {/* Tab header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(52,211,153,0.1)' }}>
            <div className="flex gap-2">
              {[
                { id: 'active',   label: 'Active',   count: active.length,   color: '#10b981' },
                { id: 'resolved', label: 'Resolved',  count: resolved.length, color: '#34d399' },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200"
                  style={activeTab === t.id
                    ? { background: `${t.color}25`, color: t.color, border: `1px solid ${t.color}40`, boxShadow: `0 4px 12px ${t.color}20` }
                    : { background: 'rgba(255,255,255,0.88)', color: '#475569', border: '1px solid rgba(15,23,42,0.08)' }
                  }>
                  {t.label}
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={activeTab === t.id
                      ? { background: `${t.color}30`, color: t.color }
                      : { background: 'rgba(15,23,42,0.06)', color: '#64748b' }
                    }>{t.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <LoadingSpinner text="Loading tasks..." />
            ) : (
              <>
                {activeTab === 'active' && (
                  active.length === 0 ? (
                    <EmptyState icon="🎉" title="All clear!" description="No active complaints assigned to you." />
                  ) : (
                    <div className="space-y-3">
                      {active
                        .sort((a, b) => {
                          const po = { High: 0, Medium: 1, Low: 2 }
                          if (po[a.priority] !== po[b.priority]) return po[a.priority] - po[b.priority]
                          return new Date(b.assignedAt || b.createdAt) - new Date(a.assignedAt || a.createdAt)
                        })
                        .map(c => (
                          <AssignedComplaintCard key={c._id} complaint={c}
                            onStartWork={handleStartWork} onUpdateStatus={setResolveTarget} onView={setDetailId} />
                        ))}
                    </div>
                  )
                )}
                {activeTab === 'resolved' && (
                  resolved.length === 0 ? (
                    <EmptyState icon="📋" title="No resolved complaints" description="Completed tasks will appear here." />
                  ) : (
                    <div className="space-y-3">
                      {resolved.map(c => (
                        <AssignedComplaintCard key={c._id} complaint={c}
                          onStartWork={null} onUpdateStatus={null} onView={setDetailId} />
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {detailId && (
        <ComplaintDetailModal complaintId={detailId} onClose={() => setDetailId(null)}
          onStartWork={handleStartWork} onUpdateStatus={setResolveTarget} />
      )}
      {resolveTarget && (
        <UpdateStatusModal complaint={resolveTarget} onClose={() => setResolveTarget(null)} onSuccess={handleResolved} />
      )}
    </div>
  )
}

export default WorkerDashboard

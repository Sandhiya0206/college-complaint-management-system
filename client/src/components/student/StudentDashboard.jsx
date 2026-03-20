import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useComplaintContext } from '../../context/ComplaintContext'
import { complaintService } from '../../services/complaint.service'
import ComplaintList from '../student/ComplaintList'
import ComplaintForm from '../student/ComplaintForm'
import ProfileForm from '../student/ProfileForm'
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates'
import { PlusCircle, ClipboardList, Clock, CheckCircle2, BarChart3, Sparkles, User, TrendingUp, AlertCircle } from 'lucide-react'

const STAT_CONFIG = [
  { key: 'total',      label: 'Total Filed',   icon: BarChart3,    accent: '#6366f1', bg: 'rgba(99,102,241,0.12)',   border: 'rgba(99,102,241,0.25)'  },
  { key: 'pending',    label: 'Pending',        icon: Clock,        accent: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.25)'  },
  { key: 'inProgress', label: 'In Progress',    icon: TrendingUp,   accent: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   border: 'rgba(59,130,246,0.25)'  },
  { key: 'resolved',   label: 'Resolved',       icon: CheckCircle2, accent: '#10b981', bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.25)'  },
]

const StudentDashboard = () => {
  const { user } = useAuth()
  const { complaints, dispatch } = useComplaintContext()
  const setComplaints = (all) => dispatch({ type: 'SET_COMPLAINTS', payload: all })
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 })
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('complaints')

  useRealTimeUpdates()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const data = await complaintService.getMyComplaints({})
      const all = data.complaints || []
      setComplaints(all)
      setStats({
        total: all.length,
        pending: all.filter(c => ['Submitted', 'Assigned'].includes(c.status)).length,
        inProgress: all.filter(c => c.status === 'In Progress').length,
        resolved: all.filter(c => c.status === 'Resolved').length,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleComplaintCreated = () => {
    setShowForm(false)
    setRefreshKey(k => k + 1)
    loadData()
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const resolveRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f6f3ee 0%, #faf8f4 42%, #f2efe9 100%)' }}>
      {/* Background pattern */}
      <div className="fixed inset-0 pointer-events-none -z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(37,99,235,0.45) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[100px] opacity-20"
          style={{ background: 'radial-gradient(circle, #dbeafe, #bfdbfe)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[80px] opacity-10"
          style={{ background: 'radial-gradient(circle, #fef3c7, #fde68a)' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Hero banner ── */}
        <div className="relative overflow-hidden rounded-3xl p-7 text-white"
          style={{ background: 'linear-gradient(135deg, #4338ca 0%, #3b82f6 50%, #06b6d4 100%)', boxShadow: '0 20px 60px rgba(99,102,241,0.4)' }}>
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-32 w-32 h-32 rounded-full bg-cyan-400/20 blur-2xl" />
          <div className="absolute top-4 right-4 w-24 h-24 opacity-10">
            <svg viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="1" strokeDasharray="4 4"/>
              <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="1" strokeDasharray="3 3"/>
              <circle cx="50" cy="50" r="15" stroke="white" strokeWidth="1"/>
            </svg>
          </div>

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-200 text-sm font-medium">{greeting} 👋</span>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-white/15 text-blue-100 border border-white/20">
                  🎓 Student
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-1">{user?.name?.split(' ')[0]}</h1>
              <p className="text-blue-200 text-sm">
                {stats.total === 0
                  ? 'No complaints yet — submit your first one!'
                  : `${stats.pending} pending · ${stats.resolved} resolved · ${resolveRate}% resolution rate`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {stats.total > 0 && (
                <div className="text-center px-4 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
                  <div className="text-2xl font-black">{resolveRate}%</div>
                  <div className="text-[10px] text-blue-200 font-semibold uppercase tracking-wide">Resolved</div>
                </div>
              )}
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.97)', color: '#1e40af', boxShadow: '0 10px 22px rgba(15,23,42,0.16)' }}
              >
                <PlusCircle size={17} />
                New Complaint
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STAT_CONFIG.map(({ key, label, icon: Icon, accent, bg, border }) => (
            <div key={key}
              className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default"
              style={{ background: 'rgba(255,255,255,0.92)', border: `1px solid ${border}`, backdropFilter: 'blur(12px)', boxShadow: '0 10px 26px rgba(15,23,42,0.08)' }}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-30 -translate-y-4 translate-x-4"
                style={{ background: accent }} />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: bg, border: `1px solid ${border}` }}>
                  <Icon size={18} style={{ color: accent }} />
                </div>
                <div className="text-3xl font-black text-slate-900 tabular-nums">{stats[key]}</div>
                <div className="text-xs font-semibold mt-0.5 uppercase tracking-wide" style={{ color: accent }}>{label}</div>
                {stats.total > 0 && (
                  <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(15,23,42,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: `${Math.round((stats[key] / stats.total) * 100)}%`,
                      background: `linear-gradient(90deg, ${accent}, ${accent}cc)`
                    }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab nav ── */}
        <div className="flex gap-2">
          {[
            { id: 'complaints', label: 'My Complaints', icon: <ClipboardList size={14} /> },
            { id: 'profile',    label: 'Profile',        icon: <User size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200"
              style={activeTab === t.id
                ? { background: 'linear-gradient(135deg,#6366f1,#3b82f6)', color: 'white', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }
                : { background: 'rgba(255,255,255,0.86)', color: '#475569', border: '1px solid rgba(15,23,42,0.08)' }
              }
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Complaints tab ── */}
        {activeTab === 'complaints' && (
          <div className="rounded-3xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(15,23,42,0.08)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 28px rgba(15,23,42,0.08)' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <ClipboardList size={16} style={{ color: '#818cf8' }} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">My Complaints</h2>
                  <p className="text-xs text-slate-500">{complaints.length} total submitted</p>
                </div>
              </div>
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                <Sparkles size={12} /> Refresh
              </button>
            </div>
            <div className="p-6">
              <ComplaintList key={refreshKey} complaints={complaints} />
            </div>
          </div>
        )}

        {/* ── Profile tab ── */}
        {activeTab === 'profile' && (
          <ProfileForm user={user} />
        )}
      </div>

      {/* ── New Complaint Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <ComplaintForm onSuccess={handleComplaintCreated} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentDashboard

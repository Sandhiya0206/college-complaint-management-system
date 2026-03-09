import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useComplaintContext } from '../../context/ComplaintContext'
import { complaintService } from '../../services/complaint.service'
import ComplaintList from '../student/ComplaintList'
import ComplaintForm from '../student/ComplaintForm'
import ProfileForm from '../student/ProfileForm'
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates'
import { PlusCircle, ClipboardList, Clock, CheckCircle2, BarChart3, Sparkles, User } from 'lucide-react'

const STAT_CONFIG = [
  { key: 'total',      label: 'Total',       icon: BarChart3,    bg: 'bg-blue-50',   ring: 'ring-blue-100',   text: 'text-blue-600',    bar: 'bg-blue-500'    },
  { key: 'pending',    label: 'Pending',      icon: Clock,        bg: 'bg-amber-50',  ring: 'ring-amber-100',  text: 'text-amber-600',   bar: 'bg-amber-400'   },
  { key: 'inProgress', label: 'In Progress',  icon: ClipboardList,bg: 'bg-indigo-50', ring: 'ring-indigo-100', text: 'text-indigo-600',  bar: 'bg-indigo-500'  },
  { key: 'resolved',   label: 'Resolved',     icon: CheckCircle2, bg: 'bg-emerald-50',ring: 'ring-emerald-100',text: 'text-emerald-600', bar: 'bg-emerald-500' },
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

  return (
    <div className="min-h-screen bg-gray-50/80">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white shadow-lg shadow-indigo-200">
          {/* decorative blobs */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-20 w-24 h-24 bg-blue-400/20 rounded-full blur-xl" />

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm font-medium mb-1">{greeting} 👋</p>
              <h1 className="text-2xl font-black tracking-tight">{user?.name?.split(' ')[0]}</h1>
              <p className="text-indigo-200 text-sm mt-1">
                {stats.total === 0
                  ? 'No complaints yet — file one below.'
                  : `You have ${stats.pending} pending · ${stats.resolved} resolved`}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:bg-indigo-50 active:scale-95 transition-all"
            >
              <PlusCircle size={16} />
              <span className="hidden sm:inline">New Complaint</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_CONFIG.map(({ key, label, icon: Icon, bg, ring, text, bar }) => (
            <div key={key} className={`stat-card ring-1 ${ring} animate-fade-in-up`}>
              <div className={`inline-flex p-2 rounded-xl ${bg} ${text} mb-3 ring-1 ${ring}`}>
                <Icon size={18} />
              </div>
              <div className="text-3xl font-black text-gray-900 tabular-nums">{stats[key]}</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
              {stats.total > 0 && (
                <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bar} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.round((stats[key] / stats.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1">
          {[
            { id: 'complaints', label: 'My Complaints', icon: <ClipboardList size={14} /> },
            { id: 'profile',    label: 'Profile',        icon: <User size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700 border border-gray-200'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Complaints tab */}
        {activeTab === 'complaints' && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <ClipboardList size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">My Complaints</h2>
            </div>
            <button
              onClick={loadData}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
            >
              <Sparkles size={12} /> Refresh
            </button>
          </div>
          <ComplaintList key={refreshKey} complaints={complaints} />
        </div>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <ProfileForm user={user} />
        )}
      </div>

      {/* New Complaint Modal */}
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

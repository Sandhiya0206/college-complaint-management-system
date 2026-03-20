import { NavLink } from 'react-router-dom'
import { X, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const ROLE_META = {
  student: { gradient: 'from-blue-500 to-indigo-600',   accent: '#4f46e5',  activeColor: '#3730a3', activeBg: 'rgba(99,102,241,0.12)',   bar: '#4f46e5' },
  admin:   { gradient: 'from-violet-600 to-purple-600', accent: '#7c3aed',  activeColor: '#5b21b6', activeBg: 'rgba(124,58,237,0.12)',   bar: '#7c3aed' },
  worker:  { gradient: 'from-emerald-500 to-teal-600',  accent: '#059669',  activeColor: '#065f46', activeBg: 'rgba(5,150,105,0.12)',    bar: '#059669' },
}

const Sidebar = ({ navItems = [], isOpen, onClose }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const meta = ROLE_META[user?.role] || ROLE_META.student
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  const handleLogout = async () => {
    await logout()
    toast.info('Signed out successfully')
    navigate('/')
  }

  const content = (
    <aside className="w-64 h-full flex flex-col"
      style={{ background: 'rgba(255,255,255,0.96)', borderRight: '1px solid rgba(15,23,42,0.09)', backdropFilter: 'blur(20px)' }}>
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${meta.accent}1f, transparent)`, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white text-base`}
            style={{ boxShadow: `0 4px 12px ${meta.accent}40` }}>
            🏛️
          </div>
          <div>
            <div className="text-slate-900 font-bold text-sm tracking-tight">CampusResolve</div>
            <div className="text-[11px] capitalize font-medium" style={{ color: meta.accent }}>{user?.role} Portal</div>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: '#64748b' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(15,23,42,0.06)'; e.currentTarget.style.color='#0f172a' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748b' }}>
          <X size={17} />
        </button>
      </div>

      {/* User info */}
      <div className="m-3 p-3 rounded-2xl" style={{ background: 'rgba(248,250,252,0.95)', border: '1px solid rgba(15,23,42,0.08)' }}>
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center font-bold text-sm flex-shrink-0`}
            style={{ boxShadow: `0 4px 12px ${meta.accent}40` }}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-900 truncate">{user?.name}</div>
            <div className="text-[11px] truncate" style={{ color: '#64748b' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-black uppercase tracking-widest px-2 mb-2 mt-1" style={{ color: '#64748b' }}>Navigation</p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 font-medium"
            style={({ isActive }) => isActive
              ? { background: meta.activeBg, color: meta.activeColor, border: `1px solid ${meta.accent}30` }
              : { color: '#475569', border: '1px solid transparent' }
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ background: meta.bar }} />}
                {Icon && (
                  <Icon size={16} style={{ color: isActive ? meta.activeColor : '#64748b' }} />
                )}
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout at bottom */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all font-medium group"
          style={{ color: '#f87171' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}
        >
          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
          Sign out
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Overlay — shown on all screen sizes when isOpen */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <div className="relative z-50 w-64 h-full animate-slide-right">{content}</div>
        </div>
      )}
    </>
  )
}

export default Sidebar

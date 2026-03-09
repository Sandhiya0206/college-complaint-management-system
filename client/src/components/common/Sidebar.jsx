import { NavLink } from 'react-router-dom'
import { X, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const ROLE_META = {
  student: { gradient: 'from-indigo-600 to-blue-700',    active: 'bg-indigo-50 text-indigo-700 border-indigo-200', bar: 'bg-indigo-600' },
  admin:   { gradient: 'from-purple-600 to-violet-700',  active: 'bg-purple-50 text-purple-700 border-purple-200', bar: 'bg-purple-600' },
  worker:  { gradient: 'from-emerald-600 to-teal-700',   active: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-600' },
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
    <aside className="w-64 bg-white h-full flex flex-col border-r border-gray-200/80 shadow-sm">
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${meta.gradient} px-4 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white text-base">
            🏛️
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight">CampusResolve</div>
            <div className="text-white/60 text-[11px] capitalize font-medium">{user?.role} Portal</div>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <X size={17} />
        </button>
      </div>

      {/* User info card */}
      <div className="m-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-gray-900 truncate">{user?.name}</div>
            <div className="text-[11px] text-gray-500 truncate">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2 mt-1">Navigation</p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 font-medium ${
                isActive
                  ? `${meta.active} border`
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 ${meta.bar} rounded-r-full`} />}
                {Icon && (
                  <Icon
                    size={16}
                    className={isActive ? `text-current` : 'text-gray-400 group-hover:text-gray-600 transition-colors'}
                  />
                )}
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout at bottom */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all font-medium group"
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

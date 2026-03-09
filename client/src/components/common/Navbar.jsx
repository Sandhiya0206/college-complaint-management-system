import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, ChevronDown, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { useNotifications } from '../../context/NotificationContext'
import { toast } from 'react-toastify'
import NotificationDropdown from './NotificationDropdown'

const ROLE_GRADIENT = {
  student: 'from-indigo-500 to-blue-600',
  admin:   'from-purple-500 to-violet-600',
  worker:  'from-emerald-500 to-teal-600',
}
const ROLE_BADGE = {
  student: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  admin:   'bg-purple-50 text-purple-700 border-purple-200',
  worker:  'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const Navbar = ({ onMenuClick, navLinks = [] }) => {
  const { user, logout } = useAuth()
  const { isConnected } = useSocket()
  const { unreadCount, isOpen: notifOpen, dispatch: notifDispatch } = useNotifications()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setUserMenuOpen(false)
    await logout()
    toast.info('Signed out successfully')
    navigate('/')
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const gradient = ROLE_GRADIENT[user?.role] || 'from-gray-500 to-gray-600'
  const badge = ROLE_BADGE[user?.role] || 'bg-gray-50 text-gray-600 border-gray-200'

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/80 flex items-center px-4 gap-3 sticky top-0 z-20 shadow-sm">
      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors active:scale-95"
      >
        <Menu size={20} />
      </button>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:scale-105 transition-transform`}>
          🏛️
        </div>
        <span className="font-bold text-gray-900 text-sm hidden sm:block tracking-tight">CampusResolve</span>
      </Link>

      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-0.5 ml-4">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all font-medium"
          >
            {Icon && <Icon size={15} className="opacity-70" />}
            {label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* Connection pill */}
        <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all ${
          isConnected
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}>
          {isConnected
            ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live</>
            : <><WifiOff size={12} />Offline</>
          }
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => notifDispatch({ type: 'TOGGLE_OPEN' })}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-600 transition-all active:scale-95"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 animate-bounce-in">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationDropdown />}
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all active:scale-95"
          >
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-xs font-bold shadow-sm`}>
              {initials}
            </div>
            <div className="hidden sm:block text-left leading-none">
              <div className="text-sm font-semibold text-gray-900">{user?.name?.split(' ')[0]}</div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${badge} mt-0.5 inline-block capitalize`}>
                {user?.role}
              </span>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-gray-200/80 overflow-hidden z-50 animate-fade-in-up">
              <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-xs font-bold`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{user?.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, ChevronDown, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { useNotifications } from '../../context/NotificationContext'
import { toast } from 'react-toastify'
import NotificationDropdown from './NotificationDropdown'

const ROLE_GRADIENT = {
  student: 'from-blue-500 to-indigo-600',
  admin:   'from-violet-600 to-purple-600',
  worker:  'from-emerald-500 to-teal-600',
}
const ROLE_ACCENT = {
  student: '#6366f1',
  admin:   '#a78bfa',
  worker:  '#10b981',
}
const ROLE_BADGE = {
  student: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  admin:   'bg-violet-500/20 text-violet-300 border-violet-500/30',
  worker:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
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
    navigate('/', { replace: true })
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const gradient = ROLE_GRADIENT[user?.role] || 'from-gray-500 to-gray-600'
  const badge = ROLE_BADGE[user?.role] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  const accent = ROLE_ACCENT[user?.role] || '#6366f1'

  return (
    <header className="h-16 flex items-center px-4 gap-3 sticky top-0 z-20"
      style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl transition-colors active:scale-95"
        style={{ color: '#64748b' }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(15,23,42,0.06)'; e.currentTarget.style.color='#0f172a' }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748b' }}
      >
        <Menu size={20} />
      </button>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:scale-105 transition-transform`}
          style={{ boxShadow: `0 4px 12px ${accent}40` }}>
          🏛️
        </div>
        <span className="font-bold text-slate-900 text-sm hidden sm:block tracking-tight">CampusResolve</span>
      </Link>

      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-0.5 ml-4">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(15,23,42,0.06)'; e.currentTarget.style.color='#0f172a' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748b' }}
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
            ? 'border-emerald-500/30 text-emerald-400'
            : 'border-slate-200 text-slate-500'
          }`} style={{ background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(248,250,252,0.9)' }}>
          {isConnected
            ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</>
            : <><WifiOff size={12} />Offline</>
          }
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => notifDispatch({ type: 'TOGGLE_OPEN' })}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95"
            style={{ color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(15,23,42,0.06)'; e.currentTarget.style.color='#0f172a' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748b' }}
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
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-all active:scale-95"
            style={{ border: '1px solid rgba(15,23,42,0.1)', background: 'rgba(255,255,255,0.75)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(248,250,252,1)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          >
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-xs font-bold shadow-sm`}
              style={{ boxShadow: `0 4px 12px ${accent}40` }}>
              {initials}
            </div>
            <div className="hidden sm:block text-left leading-none">
              <div className="text-sm font-semibold text-slate-900">{user?.name?.split(' ')[0]}</div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${badge} mt-0.5 inline-block capitalize`}>
                {user?.role}
              </span>
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-52 rounded-2xl overflow-hidden z-50 animate-fade-in-up"
              style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(15,23,42,0.1)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 50px rgba(15,23,42,0.18)' }}>
              <div className="px-4 py-3 border-b" style={{ background: 'rgba(248,250,252,0.95)', borderColor: 'rgba(15,23,42,0.08)' }}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-xs font-bold`}
                    style={{ boxShadow: `0 4px 12px ${accent}40` }}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{user?.name}</div>
                    <div className="text-xs truncate" style={{ color: '#64748b' }}>{user?.email}</div>
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-colors font-medium"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
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

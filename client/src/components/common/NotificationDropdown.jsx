import { useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, AlertCircle, RefreshCw, MessageSquare, UserCheck, XCircle, AlertTriangle } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { useAuth } from '../../context/AuthContext'
import { adminService } from '../../services/admin.service'
import { workerService } from '../../services/worker.service'
import { complaintService } from '../../services/complaint.service'
import { formatRelativeTime } from '../../utils/helpers'

const TYPE_META = {
  complaint_created:    { icon: MessageSquare,  bg: 'bg-blue-100',    text: 'text-blue-600'   },
  complaint_assigned:   { icon: UserCheck,      bg: 'bg-indigo-100',  text: 'text-indigo-600' },
  status_changed:       { icon: RefreshCw,      bg: 'bg-amber-100',   text: 'text-amber-600'  },
  complaint_resolved:   { icon: Check,          bg: 'bg-emerald-100', text: 'text-emerald-600'},
  complaint_rejected:   { icon: XCircle,        bg: 'bg-red-100',     text: 'text-red-600'    },
  complaint_escalated:  { icon: AlertTriangle,  bg: 'bg-orange-100',  text: 'text-orange-600' },
  complaint_completed:  { icon: CheckCheck,     bg: 'bg-green-100',   text: 'text-green-600'  },
}

const getService = (role) => {
  if (role === 'admin') return adminService
  if (role === 'worker') return workerService
  if (role === 'student') return complaintService
  return null
}

const NotificationDropdown = () => {
  const { notifications, dispatch, markAsRead, markAllRead } = useNotifications()
  const { user } = useAuth()
  const ref = useRef(null)

  // Click-outside to close
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        dispatch({ type: 'TOGGLE_OPEN' })
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dispatch])

  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const service = getService(user?.role)
        if (service?.getNotifications) {
          const data = await service.getNotifications({ limit: 10 })
          dispatch({ type: 'SET_NOTIFICATIONS', payload: data.notifications || [] })
        }
      } catch (e) {
        console.error('Failed to load notifications:', e)
      }
    }
    if (user) loadNotifs()
  }, [user])

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200/80 z-50 overflow-hidden animate-fade-in-up"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Bell size={14} className="text-indigo-600" />
          </div>
          <span className="font-bold text-sm text-gray-900">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
          >
            <CheckCheck size={12} />
            All read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="py-10 text-center px-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell size={22} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">All caught up!</p>
            <p className="text-xs text-gray-400 mt-1">No new notifications right now.</p>
          </div>
        ) : (
          notifications.slice(0, 10).map((notif) => {
            const type = TYPE_META[notif.type] || { icon: AlertCircle, bg: 'bg-gray-100', text: 'text-gray-500' }
            const Icon = type.icon
            return (
              <div
                key={notif._id}
                className={`px-4 py-3 hover:bg-gray-50/80 cursor-pointer transition-colors ${!notif.isRead ? 'bg-indigo-50/40' : ''}`}
                onClick={() => !notif.isRead && markAsRead([notif._id])}
              >
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-xl ${type.bg} ${type.text} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">{formatRelativeTime(notif.createdAt)}</p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0 animate-pulse" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
          <p className="text-[10px] text-gray-400 text-center font-medium">
            Showing {Math.min(notifications.length, 10)} of {notifications.length} notifications
          </p>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown

import { createContext, useContext, useReducer, useCallback } from 'react'
import { toast } from 'react-toastify'

const NotificationContext = createContext(null)

const initialState = {
  notifications: [],
  unreadCount: 0,
  isOpen: false
}

const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.isRead).length
      }
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1
      }
    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          action.payload.includes(n._id) ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - action.payload.length)
      }
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0
      }
    case 'TOGGLE_OPEN':
      return { ...state, isOpen: !state.isOpen }
    case 'SET_OPEN':
      return { ...state, isOpen: action.payload }
    default:
      return state
  }
}

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState)

  const addNotification = useCallback((notification, showToast = true) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
    if (showToast) {
      toast.info(notification.message, {
        toastId: notification._id || Date.now(),
        icon: '🔔'
      })
    }
  }, [])

  const markAsRead = useCallback((ids) => {
    dispatch({ type: 'MARK_READ', payload: ids })
  }, [])

  const markAllRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_READ' })
  }, [])

  return (
    <NotificationContext.Provider value={{
      ...state,
      dispatch,
      addNotification,
      markAsRead,
      markAllRead
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}

export default NotificationContext

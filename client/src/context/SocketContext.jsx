import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      // Read token from cookie (works since socket connects same-origin via proxy)
      // Fall back to localStorage token stored at login
      const cookieToken = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1]
      const token = cookieToken || localStorage.getItem('authToken')

      if (!token) {
        console.warn('Socket: no auth token found, skipping connection')
        return
      }

      // Connect via same origin so Vite proxy forwards to port 5000
      const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin
      socketRef.current = io(socketUrl, {
        auth: { token },
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling']
      })

      socketRef.current.on('connect', () => {
        setIsConnected(true)
        console.log('🔌 Socket connected:', socketRef.current.id)
        // Join room
        socketRef.current.emit('join_room', { role: user.role, userId: user._id })
      })

      socketRef.current.on('disconnect', () => {
        setIsConnected(false)
        console.log('🔌 Socket disconnected')
      })

      socketRef.current.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message)
        setIsConnected(false)
      })

      return () => {
        if (socketRef.current) {
          socketRef.current.emit('leave_room', { role: user.role, userId: user._id })
          socketRef.current.disconnect()
          socketRef.current = null
          setIsConnected(false)
        }
      }
    }
  }, [isAuthenticated, user?._id])

  const getSocket = () => socketRef.current

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, getSocket }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) throw new Error('useSocket must be used within SocketProvider')
  return context
}

export default SocketContext

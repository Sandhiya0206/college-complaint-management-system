import { useEffect, useCallback } from 'react'
import { useSocket } from '../context/SocketContext'
import { useComplaintContext } from '../context/ComplaintContext'
import { useNotifications } from '../context/NotificationContext'
import { SOCKET_EVENTS } from '../utils/constants'
import { toast } from 'react-toastify'

export const useRealTimeUpdates = () => {
  const { socket } = useSocket()
  const { addComplaint, updateComplaint } = useComplaintContext()
  const { addNotification } = useNotifications()

  const handleComplaintCreated = useCallback((data) => {
    const { complaint, assignedWorker, aiAnalysis } = data
    addComplaint(complaint)
    const msg = assignedWorker
      ? `New ${complaint.category} complaint auto-assigned to ${assignedWorker.name}`
      : `New ${complaint.category} complaint submitted`
    toast.info(msg, { icon: '📋' })
    addNotification({ _id: Date.now(), title: 'New Complaint', message: msg, isRead: false }, false)
  }, [addComplaint, addNotification])

  const handleComplaintAssigned = useCallback((data) => {
    const { complaint, aiAnalysis, studentInfo, location } = data
    updateComplaint({ _id: complaint._id, status: 'Assigned' })
    const msg = `New ${complaint.category} complaint assigned at ${location}`
    toast.success(msg, { icon: '🔔' })
    addNotification({ _id: Date.now(), title: 'Complaint Assigned', message: msg, isRead: false }, false)
  }, [updateComplaint, addNotification])

  const handleStatusChanged = useCallback((data) => {
    const { complaintId, newStatus, assignedTo } = data
    updateComplaint({ _id: complaintId, status: newStatus })
    const msgs = {
      Assigned: `Your complaint has been assigned to ${assignedTo || 'a worker'}`,
      'In Progress': 'Work has started on your complaint',
      Resolved: 'Your complaint has been resolved! ✅',
      Rejected: 'Your complaint has been rejected'
    }
    const msg = msgs[newStatus] || `Complaint status updated to ${newStatus}`
    if (newStatus === 'Resolved') {
      toast.success(msg, { icon: '🎉', autoClose: 6000 })
    } else {
      toast.info(msg, { icon: '🔄' })
    }
  }, [updateComplaint])

  const handleComplaintResolved = useCallback((data) => {
    const { complaintId } = data
    updateComplaint({ _id: complaintId, status: 'Resolved' })
    toast.success('Complaint resolved! ✅', { icon: '🎉', autoClose: 6000 })
  }, [updateComplaint])

  const handleComplaintRejected = useCallback((data) => {
    const { complaintId, reason } = data
    updateComplaint({ _id: complaintId, status: 'Rejected' })
    toast.error(`Complaint rejected: ${reason}`, { icon: '❌' })
  }, [updateComplaint])

  useEffect(() => {
    if (!socket) return

    socket.on(SOCKET_EVENTS.COMPLAINT_CREATED, handleComplaintCreated)
    socket.on(SOCKET_EVENTS.COMPLAINT_ASSIGNED, handleComplaintAssigned)
    socket.on(SOCKET_EVENTS.STATUS_CHANGED, handleStatusChanged)
    socket.on(SOCKET_EVENTS.COMPLAINT_RESOLVED, handleComplaintResolved)
    socket.on(SOCKET_EVENTS.COMPLAINT_REJECTED, handleComplaintRejected)

    return () => {
      socket.off(SOCKET_EVENTS.COMPLAINT_CREATED, handleComplaintCreated)
      socket.off(SOCKET_EVENTS.COMPLAINT_ASSIGNED, handleComplaintAssigned)
      socket.off(SOCKET_EVENTS.STATUS_CHANGED, handleStatusChanged)
      socket.off(SOCKET_EVENTS.COMPLAINT_RESOLVED, handleComplaintResolved)
      socket.off(SOCKET_EVENTS.COMPLAINT_REJECTED, handleComplaintRejected)
    }
  }, [socket, handleComplaintCreated, handleComplaintAssigned, handleStatusChanged, handleComplaintResolved, handleComplaintRejected])
}

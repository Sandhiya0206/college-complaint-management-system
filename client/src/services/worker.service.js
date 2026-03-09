import api from './api'

export const workerService = {
  getAssignedComplaints: async (params = {}) => {
    const { data } = await api.get('/worker/assigned-complaints', { params })
    return data
  },

  getComplaintById: async (id) => {
    const { data } = await api.get(`/worker/complaints/${id}`)
    return data
  },

  startWork: async (id) => {
    const { data } = await api.put(`/worker/complaints/${id}/start`)
    return data
  },

  completeComplaint: async (id, formData) => {
    const { data } = await api.put(`/worker/complaints/${id}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  getStats: async () => {
    const { data } = await api.get('/worker/stats')
    return data
  },

  getNotifications: async (params = {}) => {
    const { data } = await api.get('/worker/notifications', { params })
    return data
  },

  markNotificationsRead: async (ids = []) => {
    const { data } = await api.put('/worker/notifications/read', { ids })
    return data
  },

  updateStatus: async (id, formData) => {
    const { data } = await api.put(`/worker/complaints/${id}/status`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  /* Feature #9: AI draft */
  getAIDraft: async (id) => {
    const { data } = await api.get(`/worker/complaints/${id}/ai-draft`)
    return data
  }
}

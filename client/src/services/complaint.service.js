import api from './api'

export const complaintService = {
  // Create complaint with file upload
  createComplaint: async (formData) => {
    const { data } = await api.post('/complaints', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  getMyComplaints: async (params = {}) => {
    const { data } = await api.get('/complaints/my-complaints', { params })
    return data
  },

  getComplaintById: async (id) => {
    const { data } = await api.get(`/complaints/${id}`)
    return data
  },

  getCategories: async () => {
    const { data } = await api.get('/complaints/categories')
    return data
  },

  verifyResolution: async (id, action, reason = '') => {
    const { data } = await api.put(`/complaints/${id}/verify`, { action, reason })
    return data
  },

  submitFeedback: async (id, feedbackData) => {
    const { data } = await api.post(`/complaints/${id}/feedback`, feedbackData)
    return data
  },

  getFeedback: async (id) => {
    const { data } = await api.get(`/complaints/${id}/feedback`)
    return data
  },

  getNotifications: async (params = {}) => {
    const { data } = await api.get('/complaints/notifications/list', { params })
    return data
  },

  markNotificationsRead: async (ids = []) => {
    const { data } = await api.put('/complaints/notifications/read', { ids })
    return data
  },

  /* ── AI Features ── */
  checkDuplicate: async (payload) => {
    const { data } = await api.post('/complaints/ai/check-duplicate', payload)
    return data
  },
  checkSeverity: async (payload) => {
    const { data } = await api.post('/complaints/ai/check-severity', payload)
    return data
  },
  getGenuineness: async (payload) => {
    const { data } = await api.post('/complaints/ai/genuineness', payload)
    return data
  },
  getETA: async (category, priority) => {
    const { data } = await api.get('/complaints/ai/eta', { params: { category, priority } })
    return data
  }
}

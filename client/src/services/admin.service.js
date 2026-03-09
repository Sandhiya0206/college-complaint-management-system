import api from './api'

export const adminService = {
  getAllComplaints: async (params = {}) => {
    const { data } = await api.get('/admin/complaints', { params })
    return data
  },

  getComplaintById: async (id) => {
    const { data } = await api.get(`/admin/complaints/${id}`)
    return data
  },

  getDashboardStats: async () => {
    const { data } = await api.get('/admin/dashboard-stats')
    return data
  },

  assignComplaint: async (id, body) => {
    const { data } = await api.put(`/admin/complaints/${id}/assign`, body)
    return data
  },

  updatePriority: async (id, body) => {
    const { data } = await api.put(`/admin/complaints/${id}/priority`, body)
    return data
  },

  updateStatus: async (id, body) => {
    const { data } = await api.put(`/admin/complaints/${id}/status`, body)
    return data
  },

  rejectComplaint: async (id, reason) => {
    const { data } = await api.put(`/admin/complaints/${id}/reject`, { reason })
    return data
  },

  getWorkers: async () => {
    const { data } = await api.get('/admin/workers')
    return data
  },

  createWorker: async (body) => {
    const { data } = await api.post('/admin/workers', body)
    return data
  },

  toggleWorkerStatus: async (id) => {
    const { data } = await api.put(`/admin/workers/${id}/toggle`)
    return data
  },

  deleteWorker: async (id) => {
    const { data } = await api.delete(`/admin/workers/${id}`)
    return data
  },

  getWorkerComplaints: async (id) => {
    const { data } = await api.get(`/admin/workers/${id}/complaints`)
    return data
  },

  getNotifications: async (params = {}) => {
    const { data } = await api.get('/admin/notifications', { params })
    return data
  },

  markNotificationsRead: async (ids = []) => {
    const { data } = await api.put('/admin/notifications/read', { ids })
    return data
  },

  getEscalatedComplaints: async (params = {}) => {
    const { data } = await api.get('/admin/escalated', { params })
    return data
  },

  escalateComplaint: async (id, reason) => {
    const { data } = await api.put(`/admin/complaints/${id}/escalate`, { reason })
    return data
  },

  bulkAssign: async (complaintIds, workerId, slaHours) => {
    const { data } = await api.post('/admin/complaints/bulk-assign', { complaintIds, workerId, slaHours })
    return data
  },

  editComplaint: async (id, updates) => {
    const { data } = await api.put(`/admin/complaints/${id}`, updates)
    return data
  },

  softDeleteComplaint: async (id) => {
    const { data } = await api.delete(`/admin/complaints/${id}`)
    return data
  },

  /* ── AI Analytics ── */
  getAIInsights: async () => {
    const { data } = await api.get('/admin/ai/insights')
    return data
  },
  getWorkerPerformance: async () => {
    const { data } = await api.get('/admin/ai/worker-performance')
    return data
  }
}


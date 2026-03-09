import api from './api'

export const authService = {
  login: async (email, password, role) => {
    const { data } = await api.post('/auth/login', { email, password, role })
    return data
  },

  register: async (formData) => {
    const { data } = await api.post('/auth/register', formData)
    return data
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout')
    return data
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me')
    return data
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put('/auth/profile', profileData)
    return data
  },

  changePassword: async (currentPassword, newPassword) => {
    const { data } = await api.put('/auth/change-password', { currentPassword, newPassword })
    return data
  }
}

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor — attach token from localStorage as Bearer
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      // Clear stale token
      localStorage.removeItem('authToken')
      // Redirect to login on auth failures
      const currentPath = window.location.pathname
      if (currentPath !== '/' && currentPath !== '/login') {
        window.location.href = '/'
      }
    }
    return Promise.reject(error.response?.data || error)
  }
)

export default api

import axios from 'axios'

const resolveApiBaseUrl = () => {
  const configured = String(import.meta.env.VITE_API_URL || '').trim()
  if (!configured) return '/api'
  return configured.replace(/\/$/, '')
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

const getStoredToken = () => {
  const raw = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
  if (!raw) return null
  const token = String(raw).trim()
  if (!token || token === 'undefined' || token === 'null') return null
  return token
}

const isAuthBootstrapRoute = (url = '') => {
  const path = String(url || '').toLowerCase()
  return path.includes('/auth/login') || path.includes('/auth/register')
}

// Request interceptor — prefer sessionStorage (tab-specific) so each tab sends its own token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    config.__hadAuthToken = Boolean(token)
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
    const requestUrl = error.config?.url || ''
    const hadToken = Boolean(error.config?.__hadAuthToken)

    // Only force logout for authenticated API calls that became unauthorized.
    // Do NOT clear token state for expected 401s such as /auth/login failures.
    if (status === 401 && hadToken && !isAuthBootstrapRoute(requestUrl)) {
      sessionStorage.removeItem('authToken')
      sessionStorage.removeItem('authUser')
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      window.dispatchEvent(new Event('auth:token-expired'))
    }
    return Promise.reject(error.response?.data || error)
  }
)

export default api

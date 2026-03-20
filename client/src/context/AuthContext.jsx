import { createContext, useContext, useReducer, useEffect } from 'react'
import { authService } from '../services/auth.service'

const AuthContext = createContext(null)

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
}

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null }
    case 'AUTH_SUCCESS':
      return { user: action.payload, isAuthenticated: true, isLoading: false, error: null }
    case 'AUTH_FAILURE':
      return { ...state, isLoading: false, error: action.payload }
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false, error: null }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

// ── Auth storage helpers ────────────────────────────────────────────────────
// sessionStorage → tab-specific. Survives page refresh. Cleared when the tab closes.
// localStorage   → shared across all tabs. Used only as a fallback for new tabs.
//
// Writing to BOTH on login + reading sessionStorage first means:
//   • Each tab keeps its own independent session (worker tab ≠ student tab)
//   • Refreshing any tab stays on the same dashboard
//   • Opening a completely new tab inherits the last-used session from localStorage

function getStoredAuth() {
  const ssToken = sessionStorage.getItem('authToken')
  const ssUser  = sessionStorage.getItem('authUser')
  if (ssToken && ssUser) {
    try { return { token: ssToken, user: JSON.parse(ssUser) } } catch {}
  }
  // No sessionStorage entry — fall back to localStorage and promote it to this tab
  const lsToken = localStorage.getItem('authToken')
  const lsUser  = localStorage.getItem('authUser')
  if (lsToken && lsUser) {
    try {
      const user = JSON.parse(lsUser)
      sessionStorage.setItem('authToken', lsToken)
      sessionStorage.setItem('authUser', lsUser)
      return { token: lsToken, user }
    } catch {}
  }
  return null
}

function saveAuth(token, user) {
  const str = JSON.stringify(user)
  sessionStorage.setItem('authToken', token)
  sessionStorage.setItem('authUser',  str)
  localStorage.setItem('authToken',   token)
  localStorage.setItem('authUser',    str)
}

function clearAuth() {
  sessionStorage.removeItem('authToken')
  sessionStorage.removeItem('authUser')
  localStorage.removeItem('authToken')
  localStorage.removeItem('authUser')
}

// Lazy initializer — called once by useReducer on mount
function getInitialState() {
  const stored = getStoredAuth()
  if (stored) {
    return { user: stored.user, isAuthenticated: true, isLoading: false, error: null }
  }
  return { user: null, isAuthenticated: false, isLoading: true, error: null }
}

export const AuthProvider = ({ children }) => {
  // Start with data from localStorage — avoids the loading-spinner → redirect cycle on refresh
  const [state, dispatch] = useReducer(authReducer, undefined, getInitialState)

  useEffect(() => {
    // When the API interceptor detects a 401 it fires this event so we can log out
    // through React state instead of a hard page reload
    const handleTokenExpired = () => {
      clearAuth()
      dispatch({ type: 'LOGOUT' })
    }
    window.addEventListener('auth:token-expired', handleTokenExpired)

    checkAuth()

    return () => window.removeEventListener('auth:token-expired', handleTokenExpired)
  }, [])

  // Silently verifies the stored token with the server.
  // Does NOT show a loading spinner — cached users see their dashboard immediately.
  // Does NOT log out on network errors — only actual 401s cause a logout.
  const checkAuth = async () => {
    // getStoredAuth() already promoted any localStorage token to sessionStorage,
    // so we only need to check sessionStorage here.
    const token = sessionStorage.getItem('authToken')
    if (!token) {
      clearAuth()
      dispatch({ type: 'LOGOUT' })
      return
    }
    try {
      const data = await authService.getMe()
      // Refresh cached user without changing which token this tab owns
      const str = JSON.stringify(data.user)
      sessionStorage.setItem('authUser', str)
      localStorage.setItem('authUser',   str)
      dispatch({ type: 'AUTH_SUCCESS', payload: data.user })
    } catch {
      if (!sessionStorage.getItem('authToken')) {
        // Token was cleared by the 401 interceptor → genuine expiry
        clearAuth()
        dispatch({ type: 'LOGOUT' })
      }
      // Token still present → transient network error → stay authenticated
    }
  }

  const login = async (email, password, role) => {
    dispatch({ type: 'AUTH_START' })
    const data = await authService.login(email, password, role)
    if (data.token) saveAuth(data.token, data.user)
    dispatch({ type: 'AUTH_SUCCESS', payload: data.user })
    return data
  }

  const register = async (formData) => {
    dispatch({ type: 'AUTH_START' })
    const data = await authService.register(formData)
    if (data.token) saveAuth(data.token, data.user)
    dispatch({ type: 'AUTH_SUCCESS', payload: data.user })
    return data
  }

  const logout = async () => {
    try { await authService.logout() } catch { /* best-effort server logout */ }
    clearAuth()
    dispatch({ type: 'LOGOUT' })
  }

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' })

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      register,
      logout,
      clearError,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export default AuthContext

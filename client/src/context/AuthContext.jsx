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

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      dispatch({ type: 'AUTH_START' })
      const data = await authService.getMe()
      dispatch({ type: 'AUTH_SUCCESS', payload: data.user })
    } catch {
      localStorage.removeItem('authToken')
      dispatch({ type: 'LOGOUT' })
    }
  }

  const login = async (email, password, role) => {
    dispatch({ type: 'AUTH_START' })
    const data = await authService.login(email, password, role)
    if (data.token) localStorage.setItem('authToken', data.token)
    dispatch({ type: 'AUTH_SUCCESS', payload: data.user })
    return data
  }

  const register = async (formData) => {
    dispatch({ type: 'AUTH_START' })
    const data = await authService.register(formData)
    if (data.token) localStorage.setItem('authToken', data.token)
    dispatch({ type: 'AUTH_SUCCESS', payload: data.user })
    return data
  }

  const logout = async () => {
    await authService.logout()
    localStorage.removeItem('authToken')
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

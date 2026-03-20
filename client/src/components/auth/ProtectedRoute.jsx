import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  // Still resolving auth state — show spinner
  if (isLoading) return <LoadingSpinner fullPage />

  // Not authenticated — send to landing/login page
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Authenticated but wrong role — redirect to the correct dashboard
  if (role && user?.role !== role) {
    return <Navigate to={`/${user.role}`} replace />
  }

  return children
}

export default ProtectedRoute

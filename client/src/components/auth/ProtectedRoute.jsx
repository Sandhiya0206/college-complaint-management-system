import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner fullPage />

  if (!isAuthenticated) {
    return <Navigate to={`/?role=${role}`} state={{ from: location }} replace />
  }

  if (role && user?.role !== role) {
    return <Navigate to={`/${user?.role}/dashboard`} replace />
  }

  return children
}

export default ProtectedRoute

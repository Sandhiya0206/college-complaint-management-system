import { useNavigate } from 'react-router-dom'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <div className="text-7xl mb-4">🔍</div>
      <h1 className="text-6xl font-extrabold text-gray-200 mb-2">404</h1>
      <h2 className="text-xl font-bold text-gray-700 mb-2">Page Not Found</h2>
      <p className="text-gray-400 mb-8 max-w-xs">The page you're looking for doesn't exist or has been moved.</p>
      <button onClick={() => navigate('/')} className="btn-primary">← Back to Home</button>
    </div>
  )
}

export default NotFound

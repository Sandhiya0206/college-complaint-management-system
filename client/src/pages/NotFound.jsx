import { useNavigate } from 'react-router-dom'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4"
      style={{ background: 'linear-gradient(160deg,#06060f,#1e1b4b)' }}>
      <div className="text-8xl mb-6 animate-float">🔍</div>
      <h1 className="text-8xl font-black mb-2" style={{ color: 'rgba(99,102,241,0.3)' }}>404</h1>
      <h2 className="text-2xl font-black text-white mb-3">Page Not Found</h2>
      <p className="text-gray-500 mb-10 max-w-xs">The page you're looking for doesn't exist or has been moved.</p>
      <button onClick={() => navigate('/')}
        className="px-7 py-3 text-sm font-bold text-white rounded-2xl transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
        ← Back to Home
      </button>
    </div>
  )
}

export default NotFound

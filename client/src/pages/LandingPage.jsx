import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import { ArrowRight, Zap, Shield, BarChart3, Bell } from 'lucide-react'

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    emoji: '🎓',
    desc: 'Submit complaints by dropping an image — AI auto-detects and categorises the issue instantly.',
    gradient: 'from-blue-500 to-indigo-600',
    ring: 'ring-blue-200',
    text: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    id: 'admin',
    label: 'Admin',
    emoji: '🛡️',
    desc: 'Full visibility over all complaints, workers, analytics, and real-time assignment controls.',
    gradient: 'from-purple-500 to-violet-600',
    ring: 'ring-purple-200',
    text: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  {
    id: 'worker',
    label: 'Worker',
    emoji: '🔧',
    desc: 'See assigned tasks sorted by priority, update status, and upload completion photos.',
    gradient: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-200',
    text: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
]

const FEATURES = [
  { icon: <Zap size={16} />, label: 'AI in <1s', desc: 'Runs in browser', color: 'text-amber-500 bg-amber-50' },
  { icon: <Bell size={16} />, label: 'Real-time', desc: 'Socket.io live', color: 'text-indigo-500 bg-indigo-50' },
  { icon: <BarChart3 size={16} />, label: 'Analytics', desc: 'Charts & insights', color: 'text-violet-500 bg-violet-50' },
  { icon: <Shield size={16} />, label: 'Secure', desc: 'JWT auth', color: 'text-emerald-500 bg-emerald-50' },
]

const LandingPage = () => {
  const [mode, setMode] = useState(null)
  const [preRole, setPreRole] = useState(null)
  const [hovered, setHovered] = useState(null)
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && user) navigate(`/${user.role}`, { replace: true })
  }, [isAuthenticated, user, navigate])

  const handleRoleClick = (role) => { setPreRole(role); setMode('login') }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg,#eef2ff 0%,#faf5ff 50%,#ecfdf5 100%)' }}>
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-[1]">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-indigo-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-violet-300/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 bg-emerald-300/15 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-base shadow-lg shadow-indigo-500/30 animate-glow">
            🏛️
          </div>
          <span className="font-extrabold text-gray-900 tracking-tight">CampusResolve</span>
          <span className="badge bg-indigo-100 text-indigo-600 border-indigo-200 text-[10px] font-bold tracking-wide">AI v2</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setPreRole(null); setMode('login') }} className="btn-ghost font-semibold">
            Sign In
          </button>
          <button onClick={() => setMode('register')} className="btn-primary shadow-md shadow-indigo-500/25 px-5">
            Register Free
          </button>
        </div>
      </nav>

      <main className="relative flex-1 flex flex-col items-center px-4 pt-6 pb-16">
        {!mode ? (
          <>
            {/* Hero section */}
            <div className="text-center max-w-2xl mx-auto mb-10 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-indigo-100 text-indigo-600 rounded-full px-4 py-1.5 text-xs font-bold mb-6 shadow-sm">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                AI-Powered · Real-time · Multi-role
              </div>
              <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-[1.1] mb-5 tracking-tight">
                Campus complaints,{' '}
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
                    resolved smarter
                  </span>
                  <svg className="absolute -bottom-1 left-0 w-full opacity-70" height="5" viewBox="0 0 300 5" fill="none" preserveAspectRatio="none">
                    <path d="M0 4 Q75 0 150 4 Q225 8 300 4" stroke="url(#ug)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                    <defs><linearGradient id="ug" x1="0" x2="1"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#a855f7"/></linearGradient></defs>
                  </svg>
                </span>
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto">
                Drop an image — AI classifies the issue in milliseconds, auto-assigns the right department worker, and sets priority. Zero manual work.
              </p>
            </div>

            {/* Role cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-10">
              {ROLES.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => handleRoleClick(r.id)}
                  onMouseEnter={() => setHovered(r.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`
                    group relative text-left p-5 rounded-2xl border-2 bg-white/80 backdrop-blur-sm shadow-sm
                    transition-all duration-300 overflow-hidden animate-fade-in-up
                    ${hovered === r.id ? `border-transparent ring-4 ${r.ring} shadow-xl -translate-y-1.5` : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}
                  `}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${r.gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`} />
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${r.gradient} flex items-center justify-center text-2xl shadow-md mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    {r.emoji}
                  </div>
                  <span className={`badge ${r.badge} text-[10px] font-bold tracking-wide`}>{r.label}</span>
                  <p className="text-xs text-gray-500 leading-relaxed mt-2.5">{r.desc}</p>
                  <div className={`flex items-center gap-1 mt-3 text-xs font-bold ${r.text} transition-all duration-200 ${hovered === r.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}`}>
                    Sign in as {r.label} <ArrowRight size={11} />
                  </div>
                </button>
              ))}
            </div>

            {/* Feature strip */}
            <div className="flex flex-wrap justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {FEATURES.map(f => (
                <div key={f.label} className="flex items-center gap-2.5 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm transition-shadow hover:shadow-md">
                  <div className={`p-1.5 rounded-lg ${f.color}`}>{f.icon}</div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">{f.label}</div>
                    <div className="text-[10px] text-gray-400">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Auth panel */
          <div className="w-full max-w-md mt-4 animate-bounce-in">
            <button
              onClick={() => { setMode(null); setPreRole(null) }}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors"
            >
              <ArrowRight size={14} className="rotate-180" />
              Back
            </button>

            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-gray-300/40 border border-white p-6 sm:p-8">
              {mode === 'login' && (
                <>
                  <LoginForm prefilledRole={preRole} />
                  {(!preRole || preRole === 'student') && (
                    <p className="text-center text-sm text-gray-400 mt-5 pt-5 border-t border-gray-100">
                      New student?{' '}
                      <button onClick={() => setMode('register')} className="text-indigo-600 hover:text-indigo-700 font-semibold">
                        Create account
                      </button>
                    </p>
                  )}
                </>
              )}
              {mode === 'register' && (
                <>
                  <RegisterForm />
                  <p className="text-center text-sm text-gray-400 mt-5 pt-5 border-t border-gray-100">
                    Already have an account?{' '}
                    <button onClick={() => { setPreRole(null); setMode('login') }} className="text-indigo-600 hover:text-indigo-700 font-semibold">
                      Sign in
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default LandingPage

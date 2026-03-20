import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import { ArrowRight, Zap, Shield, BarChart3, Bell, Sparkles, Star, ChevronRight } from 'lucide-react'

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    emoji: '🎓',
    tag: 'Submit & Track',
    desc: 'Drop an image of any campus issue — the system categorises it, assigns priority, and tracks resolution automatically.',
    from: '#3b82f6', via: '#6366f1', to: '#818cf8',
    gradClass: 'from-blue-500 via-indigo-500 to-indigo-400',
    glow: 'rgba(99,102,241,0.35)',
    border: 'border-indigo-200',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    textColor: 'text-indigo-600',
    ringClass: 'ring-indigo-300/60',
    stats: ['Fast Routing', 'Live Updates', 'PDF Export'],
  },
  {
    id: 'admin',
    label: 'Admin',
    emoji: '🛡️',
    tag: 'Command Center',
    desc: 'Full-spectrum visibility — complaints, workers, analytics, bulk assignment, and escalation controls.',
    from: '#7c3aed', via: '#a855f7', to: '#c084fc',
    gradClass: 'from-violet-600 via-purple-500 to-fuchsia-400',
    glow: 'rgba(139,92,246,0.35)',
    border: 'border-purple-200',
    badgeBg: 'bg-violet-50 text-violet-700 border-violet-200',
    textColor: 'text-violet-600',
    ringClass: 'ring-violet-300/60',
    stats: ['Analytics', 'Auto-Assign', 'Escalations'],
  },
  {
    id: 'worker',
    label: 'Worker',
    emoji: '🔧',
    tag: 'Field Operations',
    desc: 'View prioritised tasks, update status on-site, upload proof photos, and track your performance score.',
    from: '#059669', via: '#10b981', to: '#34d399',
    gradClass: 'from-emerald-600 via-teal-500 to-green-400',
    glow: 'rgba(16,185,129,0.35)',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textColor: 'text-emerald-600',
    ringClass: 'ring-emerald-300/60',
    stats: ['Priority Sort', 'Photo Proof', 'Score Board'],
  },
]

const STATS = [
  { value: '< 1s', label: 'Fast Routing' },
  { value: '3', label: 'Role Portals' },
  { value: '99%', label: 'Uptime' },
  { value: '∞', label: 'Scalable' },
]

const FLOW = [
  { step: '01', title: 'Snap & Submit', desc: 'Student drops a photo — the system categorises the issue automatically.', icon: '📸' },
  { step: '02', title: 'Smart Routing', desc: 'The system assigns priority, category, and the best available worker.', icon: '🔀' },
  { step: '03', title: 'Worker Resolves', desc: 'Field worker sees task, acts on-site, uploads completion proof.', icon: '⚡' },
  { step: '04', title: 'Admin Oversees', desc: 'Live dashboard tracks every complaint from submission to resolution.', icon: '📊' },
]

const LandingPage = () => {
  const [mode, setMode] = useState(null)
  const [preRole, setPreRole] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const heroRef = useRef(null)
  const { isAuthenticated, isLoading, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Only auto-redirect once auth is fully resolved and the user is confirmed.
    // Do NOT redirect while isLoading — that would bounce the user back before
    // they can interact with the page (e.g. when switching roles for testing).
    if (!isLoading && isAuthenticated && user) {
      navigate(`/${user.role}`, { replace: true })
    }
  }, [isLoading, isAuthenticated, user, navigate])

  useEffect(() => {
    const move = (e) => setMousePos({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 })
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  const handleRoleClick = (role) => { setPreRole(role); setMode('login') }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: 'linear-gradient(155deg, #f6f3ee 0%, #faf8f4 40%, #f1efe8 100%)' }}>

      {/* ── Dynamic background ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Star grid */}
        <div className="absolute inset-0 opacity-[0.15]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.24) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        {/* Moving gradient orbs */}
        <div className="absolute w-[700px] h-[700px] rounded-full blur-[120px] opacity-20 transition-all duration-1000"
          style={{ background: 'radial-gradient(circle, #dbeafe, #c7d2fe)', left: `${mousePos.x * 0.5}%`, top: `${mousePos.y * 0.3}%`, transform: 'translate(-50%,-50%)' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-15"
          style={{ background: 'radial-gradient(circle, #dcfce7, #bbf7d0)', right: '10%', bottom: '20%' }} />
        <div className="absolute w-[300px] h-[300px] rounded-full blur-[60px] opacity-10"
          style={{ background: 'radial-gradient(circle, #fef3c7, #fde68a)', left: '5%', bottom: '30%' }} />
        {/* Mesh grid lines */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(15,23,42,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.22) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 0 20px rgba(99,102,241,0.5)' }}>
            🏛️
            <div className="absolute -inset-0.5 rounded-2xl blur-sm opacity-50" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', zIndex: -1 }} />
          </div>
          <div>
            <span className="font-black text-slate-900 tracking-tight text-lg">CampusResolve</span>
            <div className="flex items-center gap-1 -mt-0.5">
              <span className="text-[9px] font-bold text-indigo-600 tracking-widest uppercase">Campus Platform</span>
            </div>
          </div>
          <span className="ml-1 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase rounded-full border"
            style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)', color: '#4338ca' }}>
            v2.0
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setPreRole(null); setMode('login') }}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-white/75 transition-all duration-200"
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className="px-5 py-2 text-sm font-bold text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
          >
            Get Started →
          </button>
        </div>
      </nav>

      <main className="relative flex-1 flex flex-col items-center px-4">
        {!mode ? (
          <>
            {/* ── Hero ── */}
            <div ref={heroRef} className="text-center max-w-4xl mx-auto mt-12 mb-16 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-8 border"
                style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.25)', color: '#4338ca' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Smart · Multi-role · Reliable · All in One
                <Sparkles size={11} className="text-indigo-400" />
              </div>

              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black leading-[0.95] mb-8 tracking-tighter">
                <span className="text-slate-900 block">Campus issues,</span>
                <span className="block mt-2" style={{
                  backgroundImage: 'linear-gradient(135deg, #818cf8 0%, #c084fc 40%, #fb7185 80%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                }}>
                  solved instantly.
                </span>
              </h1>

              <p className="text-slate-600 text-xl leading-relaxed max-w-2xl mx-auto mb-10">
                Drop an image — the system automatically routes the issue to the right worker and tracks every step of the resolution process.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-12">
                <button
                  onClick={() => setMode('register')}
                  className="flex items-center gap-2 px-7 py-3.5 text-base font-bold text-white rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-2xl"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 8px 30px rgba(99,102,241,0.4)' }}>
                  Start for Free <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => { setPreRole(null); setMode('login') }}
                  className="flex items-center gap-2 px-7 py-3.5 text-base font-bold text-slate-700 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-white hover:text-slate-900 transition-all duration-200">
                  Sign In <ChevronRight size={16} />
                </button>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap justify-center gap-8">
                {STATS.map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-3xl font-black text-slate-900 tabular-nums">{s.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Role cards ── */}
            <div className="w-full max-w-6xl mx-auto mb-20">
              <div className="text-center mb-10">
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-2">Choose your portal</p>
                <h2 className="text-3xl font-black text-slate-900">Three roles. One platform.</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {ROLES.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => handleRoleClick(r.id)}
                    onMouseEnter={() => setHovered(r.id)}
                    onMouseLeave={() => setHovered(null)}
                    className="group relative text-left rounded-3xl border overflow-hidden transition-all duration-500 animate-fade-in-up"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      borderColor: hovered === r.id ? r.from : 'rgba(255,255,255,0.08)',
                      background: hovered === r.id
                        ? `linear-gradient(145deg, rgba(255,255,255,0.98), rgba(248,250,252,0.95))`
                        : 'rgba(255,255,255,0.86)',
                      boxShadow: hovered === r.id ? `0 20px 60px ${r.glow}, 0 0 0 1px ${r.from}33` : '0 10px 24px rgba(15,23,42,0.08)',
                      transform: hovered === r.id ? 'translateY(-8px) scale(1.02)' : 'none',
                    }}
                  >
                    {/* Glow top */}
                    <div className="absolute top-0 left-0 right-0 h-px opacity-60 transition-opacity duration-300"
                      style={{ background: `linear-gradient(90deg, transparent, ${r.from}, transparent)`, opacity: hovered === r.id ? 1 : 0 }} />

                    <div className="p-7">
                      {/* Icon + tag */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
                          style={{ background: `linear-gradient(135deg, ${r.from}, ${r.to})`, boxShadow: `0 8px 20px ${r.glow}` }}>
                          {r.emoji}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border"
                          style={{ color: r.from, borderColor: `${r.from}40`, background: `${r.from}15` }}>
                          {r.tag}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-black text-slate-900 mb-2">{r.label} Portal</h3>
                      <p className="text-sm text-slate-600 leading-relaxed mb-5">{r.desc}</p>

                      {/* Feature pills */}
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {r.stats.map(s => (
                          <span key={s} className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: `${r.from}20`, color: r.from }}>
                            ✓ {s}
                          </span>
                        ))}
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold transition-all duration-200"
                          style={{ color: hovered === r.id ? r.from : '#475569' }}>
                          Enter as {r.label}
                        </span>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                          style={{
                            background: hovered === r.id ? `linear-gradient(135deg,${r.from},${r.to})` : 'rgba(255,255,255,0.06)',
                            boxShadow: hovered === r.id ? `0 4px 12px ${r.glow}` : 'none',
                            transform: hovered === r.id ? 'translateX(4px)' : 'none'
                          }}>
                          <ArrowRight size={14} color="white" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── How it works ── */}
            <div className="w-full max-w-6xl mx-auto mb-24">
              <div className="text-center mb-12">
                <p className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-2">The Process</p>
                <h2 className="text-3xl font-black text-slate-900">From issue to resolution in 4 steps</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {FLOW.map((f, i) => (
                  <div key={f.step} className="relative p-6 rounded-2xl border border-slate-200 bg-white/90 group hover:border-indigo-500/40 hover:bg-white transition-all duration-300 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                    {i < FLOW.length - 1 && (
                      <div className="hidden lg:block absolute top-8 -right-3 w-6 h-px bg-gradient-to-r from-slate-300 to-transparent" />
                    )}
                    <div className="text-3xl mb-4">{f.icon}</div>
                    <div className="text-xs font-black text-indigo-500 tracking-widest mb-1.5">STEP {f.step}</div>
                    <h3 className="text-base font-black text-slate-900 mb-2">{f.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Footer strip ── */}
            <div className="w-full border-t border-slate-200 py-8">
              <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏛️</span>
                  <span className="text-slate-900 font-bold text-sm">CampusResolve</span>
                  <span className="text-slate-500 text-xs">· Campus Management</span>
                </div>
                <div className="flex items-center gap-6 text-xs text-slate-600">
                  {['Smart Routing', 'Live Updates', 'Secure JWT', 'Analytics'].map(t => (
                    <span key={t} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-indigo-500" />{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ── Auth panel ── */
          <div className="w-full max-w-md mt-8 mb-16 animate-bounce-in">
            <button
              onClick={() => { setMode(null); setPreRole(null) }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors group"
            >
              <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-0.5 transition-transform" />
              Back to home
            </button>

            <div className="rounded-3xl border border-slate-200 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(24px)', boxShadow: '0 26px 70px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.75)' }}>
              {/* Top glow bar */}
              <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, transparent)' }} />
              <div className="p-7 sm:p-9">
                {mode === 'login' && (
                  <>
                    <LoginForm prefilledRole={preRole} />
                    {(!preRole || preRole === 'student') && (
                      <p className="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-white/8">
                        New student?{' '}
                        <button onClick={() => setMode('register')} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                          Create account
                        </button>
                      </p>
                    )}
                  </>
                )}
                {mode === 'register' && (
                  <>
                    <RegisterForm />
                    <p className="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-white/8">
                      Already have an account?{' '}
                      <button onClick={() => { setPreRole(null); setMode('login') }} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                        Sign in
                      </button>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default LandingPage

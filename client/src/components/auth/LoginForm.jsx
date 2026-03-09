import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'

const ROLE_META = {
  student: { label: 'Student', emoji: '🎓', gradient: 'from-blue-500 to-indigo-600', badge: 'bg-blue-50 text-blue-600 border-blue-200' },
  admin:   { label: 'Admin',   emoji: '🛡️', gradient: 'from-purple-500 to-violet-600', badge: 'bg-purple-50 text-purple-600 border-purple-200' },
  worker:  { label: 'Worker',  emoji: '🔧', gradient: 'from-emerald-500 to-teal-600',  badge: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
}

const LoginForm = ({ prefilledRole, role: roleProp, onSwitchToRegister }) => {
  const role = prefilledRole || roleProp || 'student'
  const meta = ROLE_META[role] || ROLE_META.student
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const roleLabels = { student: 'Student', admin: 'Admin', worker: 'Worker' }
  const roleDefaults = {
    admin: { email: 'admin@college.edu', password: 'admin123' },
    worker: { email: 'electrical@college.edu', password: 'worker123' },
    student: { email: 'student1@college.edu', password: 'student123' }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const data = await login(formData.email, formData.password, role)
      const userRole = data?.user?.role || role
      toast.success(`Welcome back! Logged in as ${roleLabels[userRole] || userRole}`)
      navigate(`/${userRole}`)
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemo = () => {
    const defaults = roleDefaults[role] || {}
    setFormData(defaults)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Role badge + header */}
      <div className="text-center mb-8">
        <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-2xl shadow-lg mb-4 animate-float`}>
          {meta.emoji}
        </div>
        <h2 className="text-2xl font-black tracking-tight text-gray-900">
          {meta.label} Sign In
        </h2>
        <p className="text-gray-500 text-sm mt-1">Welcome back — enter your credentials below</p>
        <span className={`inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.badge}`}>
          {meta.label} Portal
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-2.5 text-red-700 text-sm animate-fade-in-up">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label className="label">Email address</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </span>
            <input
              type="email"
              className="input-field pl-10"
              placeholder="you@college.edu"
              value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              required
              autoFocus
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field pl-10 pr-11"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-xl font-semibold text-white text-sm tracking-wide shadow-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r ${meta.gradient} hover:shadow-xl hover:brightness-105`}
        >
          {isLoading
            ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
            : <>Sign in as {meta.label} <span className="ml-1 opacity-80">→</span></>
          }
        </button>
      </form>

      {/* Demo + register */}
      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={fillDemo}
          className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
        >
          <span>⚡</span>
          Fill demo credentials for {meta.label}
        </button>

        {role === 'student' && onSwitchToRegister && (
          <p className="text-center text-sm text-gray-500">
            No account yet?{' '}
            <button onClick={onSwitchToRegister} className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors">
              Create one here
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

export default LoginForm

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'

const RegisterForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', studentId: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      await register(formData)
      toast.success('Account created! Welcome to CampusResolve!')
      navigate('/student/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🎓</div>
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-500 text-sm mt-1">Join CampusResolve as a student</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input
            type="text" className="input-field" placeholder="John Doe"
            value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            required autoFocus
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email" className="input-field" placeholder="john@college.edu"
            value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Student ID (optional)</label>
          <input
            type="text" className="input-field" placeholder="STU001"
            value={formData.studentId} onChange={e => setFormData(p => ({ ...p, studentId: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field pr-10" placeholder="Min 6 characters"
              value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
          {isLoading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : 'Create Account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button onClick={onSwitchToLogin} className="text-indigo-600 font-medium hover:underline">
          Sign in
        </button>
      </p>
    </div>
  )
}

export default RegisterForm

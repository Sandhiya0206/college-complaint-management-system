import { useState } from 'react'
import { User, Phone, Home, Lock, Save, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authService } from '../../services/auth.service'
import { toast } from 'react-toastify'

const HOSTEL_BLOCKS = ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Other']

/**
 * ProfileForm — edit profile + change password
 * Props:
 *  - user: current user object from AuthContext
 *  - onUpdated(updatedUser): callback after profile save
 */
const ProfileForm = ({ user, onUpdated }) => {
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [hostelBlock, setHostelBlock] = useState(user?.hostelBlock || '')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPwd, setIsSavingPwd] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Name is required'); return }
    setIsSavingProfile(true)
    try {
      const data = await authService.updateProfile({ name: name.trim(), phone: phone.trim(), hostelBlock })
      toast.success('Profile updated!')
      onUpdated?.(data.user)
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    setIsSavingPwd(true)
    try {
      await authService.changePassword(currentPassword, newPassword)
      toast.success('Password changed successfully!')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err) {
      toast.error(err.message || 'Failed to change password')
    } finally {
      setIsSavingPwd(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={16} /> Profile Information
        </h3>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input-field pl-8"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Phone Number</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                className="input-field pl-8"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
          </div>

          <div>
            <label className="label">Hostel Block</label>
            <div className="relative">
              <Home size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select className="input-field pl-8" value={hostelBlock} onChange={e => setHostelBlock(e.target.value)}>
                <option value="">Select Block</option>
                {HOSTEL_BLOCKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
            <p><span className="font-medium">Email:</span> {user?.email}</p>
            <p><span className="font-medium">Role:</span> {user?.role}</p>
            {user?.studentId && <p><span className="font-medium">Student ID:</span> {user?.studentId}</p>}
          </div>

          <button type="submit" disabled={isSavingProfile} className="btn-primary w-full flex items-center justify-center gap-2">
            {isSavingProfile ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Profile</>}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={16} /> Change Password
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">Current Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="input-field pr-10"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowCurrent(p => !p)}>
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">New Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="input-field pr-10"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowNew(p => !p)}>
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm New Password <span className="text-red-500">*</span></label>
            <input
              type="password"
              className="input-field"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>
          <button type="submit" disabled={isSavingPwd} className="btn-primary w-full flex items-center justify-center gap-2">
            {isSavingPwd ? <><Loader2 size={16} className="animate-spin" /> Changing...</> : <><Lock size={15} /> Change Password</>}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileForm

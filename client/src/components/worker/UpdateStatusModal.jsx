import { useState } from 'react'
import { X, Upload, Camera, PauseCircle, CheckCircle2, Play, Sparkles } from 'lucide-react'
import { workerService } from '../../services/worker.service'
import { toast } from 'react-toastify'
import AIDraftModal from '../ai/AIDraftModal'

const STATUS_OPTIONS = [
  { value: 'In Progress', label: 'In Progress', icon: <Play size={14} />, color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'On Hold',     label: 'On Hold',     icon: <PauseCircle size={14} />, color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { value: 'Resolved',   label: 'Resolved',    icon: <CheckCircle2 size={14} />, color: 'border-green-400 bg-green-50 text-green-700' },
]

const UpdateStatusModal = ({ complaint, onClose, onSuccess }) => {
  const [status, setStatus] = useState('In Progress')
  const [remarks, setRemarks] = useState('')
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showAIDraft, setShowAIDraft] = useState(false)

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5)
    setImages(files)
    setPreviews(files.map(f => URL.createObjectURL(f)))
  }

  const validate = () => {
    if (!remarks.trim() || remarks.trim().length < 20) {
      setError('Remarks must be at least 20 characters.')
      return false
    }
    if (status === 'Resolved' && images.length === 0) {
      setError('Proof photos are required when marking as Resolved.')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setError('')
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('status', status)
      formData.append('remarks', remarks.trim())
      images.forEach(img => formData.append('images', img))
      await workerService.updateStatus(complaint._id, formData)
      toast.success(`Complaint marked as "${status}"`)
      onSuccess()
    } catch (e) {
      setError(e.message || 'Failed to update status')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Update Status</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Complaint ref */}
          <div className="p-3 bg-indigo-50 rounded-xl text-sm">
            <span className="font-mono text-indigo-600 font-medium">{complaint.complaintId}</span>
            <span className="text-gray-500 ml-2">{complaint.category} — {complaint.location}</span>
          </div>

          {/* Status selector */}
          <div>
            <label className="label mb-2">New Status <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                    status === opt.value ? opt.color + ' border-opacity-100' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label">
                Remarks <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(min. 20 chars)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAIDraft(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-medium border border-purple-200 transition-colors"
              >
                <Sparkles size={12} />
                AI Draft
              </button>
            </div>
            <textarea
              className="input-field min-h-[90px] resize-none"
              placeholder={status === 'Resolved'
                ? 'Describe what was done to resolve the issue...'
                : status === 'On Hold'
                  ? 'Explain why the work is on hold (e.g. waiting for parts)...'
                  : 'Describe current progress...'}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
            <span className={`text-xs mt-0.5 ${remarks.length < 20 ? 'text-red-400' : 'text-gray-400'}`}>
              {remarks.length}/20 min
            </span>
          </div>

          {/* Proof images */}
          <div>
            <label className="label">
              {status === 'Resolved' ? (
                <>Proof Photos <span className="text-red-500">*</span></>
              ) : (
                'Photos (optional)'
              )}
            </label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 text-gray-500 text-sm">
              <Camera size={16} />
              <span>Attach photos (max 5)</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            {previews.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {previews.map((p, i) => (
                  <img key={i} src={p} className="w-full aspect-square object-cover rounded-lg border border-gray-200" alt="" />
                ))}
              </div>
            )}
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`btn-primary flex-1 ${status === 'Resolved' ? 'bg-green-600 hover:bg-green-700' : status === 'On Hold' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            >
              {isSubmitting ? 'Updating...' : `Update to "${status}"`}
            </button>
          </div>
        </div>
      </div>

      {showAIDraft && (
        <AIDraftModal
          complaintId={complaint._id}
          onUse={(text) => { setRemarks(text); setShowAIDraft(false) }}
          onClose={() => setShowAIDraft(false)}
        />
      )}
    </div>
  )
}

export default UpdateStatusModal

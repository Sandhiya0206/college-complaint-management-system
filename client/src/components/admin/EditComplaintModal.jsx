import { useState } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import { toast } from 'react-toastify'
import { CATEGORIES } from '../../utils/constants'

const PRIORITIES = ['Low', 'Medium', 'High']

/**
 * EditComplaintModal — admin edit complaint fields
 * Props:
 *  - complaint: complaint object
 *  - onClose()
 *  - onSaved()
 */
const EditComplaintModal = ({ complaint, onClose, onSaved }) => {
  const [description, setDescription] = useState(complaint.description || '')
  const [location, setLocation] = useState(complaint.location || '')
  const [category, setCategory] = useState(complaint.category || '')
  const [priority, setPriority] = useState(complaint.priority || 'Medium')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!location.trim() || !category) {
      toast.error('Location and category are required')
      return
    }
    setIsSubmitting(true)
    try {
      await adminService.editComplaint(complaint._id, { description, location, category, priority })
      toast.success('Complaint updated!')
      onSaved()
    } catch (err) {
      toast.error(err.message || 'Failed to update complaint')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Edit Complaint</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{complaint.complaintId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category <span className="text-red-500">*</span></label>
              <select className="input-field" value={category} onChange={e => setCategory(e.target.value)} required>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority <span className="text-red-500">*</span></label>
              <select className="input-field" value={priority} onChange={e => setPriority(e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Location <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="input-field"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Hostel Block A, Room 204"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field resize-none"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditComplaintModal

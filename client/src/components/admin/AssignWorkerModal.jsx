import { useState } from 'react'
import { X, User, Briefcase } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import { toast } from 'react-toastify'

const AssignWorkerModal = ({ complaint, workers, onClose, onAssigned }) => {
  const [selectedId, setSelectedId] = useState(complaint.assignedTo?._id || complaint.assignedTo || '')
  const [slaHours, setSlaHours] = useState(24)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAssign = async () => {
    if (!selectedId) return
    setIsSubmitting(true)
    try {
      await adminService.assignComplaint(complaint._id, { workerId: selectedId, slaHours })
      toast.success('Worker assigned successfully!')
      onAssigned()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Assignment failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getWorkloadColor = (count) => {
    if (count >= 5) return 'text-red-600 bg-red-50'
    if (count >= 3) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Assign Worker</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="p-5">
          <div className="p-3 bg-indigo-50 rounded-xl text-sm mb-4">
            <span className="font-mono text-indigo-600 font-medium">{complaint.complaintId}</span>
            <p className="text-gray-600 mt-0.5">{complaint.category} — {complaint.location}</p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {workers?.map(w => (              <label
                key={w._id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedId === w._id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="worker"
                  value={w._id}
                  checked={selectedId === w._id}
                  onChange={() => setSelectedId(w._id)}
                  className="accent-indigo-600"
                />
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                  {w.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{w.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1"><Briefcase size={10} />{w.department}</div>
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${getWorkloadColor(w.activeComplaintCount ?? 0)}`}>
                  {w.activeComplaintCount ?? 0} active
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">SLA Deadline</label>
              <select className="input-field text-sm" value={slaHours} onChange={e => setSlaHours(Number(e.target.value))}>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours (default)</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleAssign} disabled={!selectedId || isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Assigning...' : 'Assign Worker'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssignWorkerModal

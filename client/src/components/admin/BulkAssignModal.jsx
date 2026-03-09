import { useState } from 'react'
import { X, Users, Loader2 } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import { toast } from 'react-toastify'

/**
 * BulkAssignModal
 * Props:
 *  - selectedIds: string[]  — selected complaint IDs
 *  - workers: Worker[]
 *  - onClose()
 *  - onSuccess()
 */
const BulkAssignModal = ({ selectedIds, workers, onClose, onSuccess }) => {
  const [workerId, setWorkerId] = useState('')
  const [slaHours, setSlaHours] = useState(24)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAssign = async () => {
    if (!workerId) { toast.error('Please select a worker'); return }
    setIsSubmitting(true)
    try {
      const result = await adminService.bulkAssign(selectedIds, workerId, slaHours)
      toast.success(`${result.assigned ?? selectedIds.length} complaints assigned!`)
      onSuccess()
    } catch (e) {
      toast.error(e.message || 'Bulk assign failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getWorkloadColor = (count) => {
    if (count >= 5) return 'text-red-600'
    if (count >= 3) return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={16} /> Bulk Assign
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{selectedIds.length} complaint{selectedIds.length !== 1 ? 's' : ''} selected</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Worker selection */}
          <div>
            <label className="label">Assign Worker <span className="text-red-500">*</span></label>
            <select className="input-field" value={workerId} onChange={e => setWorkerId(e.target.value)}>
              <option value="">Select a worker...</option>
              {workers?.map(w => (
                <option key={w._id} value={w._id}>
                  {w.name} — {w.department} ({w.activeComplaintCount ?? 0} active)
                </option>
              ))}
            </select>
          </div>

          {/* SLA */}
          <div>
            <label className="label">SLA Deadline</label>
            <select className="input-field" value={slaHours} onChange={e => setSlaHours(Number(e.target.value))}>
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours (default)</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
          </div>

          {/* Selected worker info */}
          {workerId && (() => {
            const w = workers?.find(x => x._id === workerId)
            if (!w) return null
            return (
              <div className="p-3 bg-indigo-50 rounded-xl text-sm">
                <p className="font-medium text-indigo-800">{w.name}</p>
                <p className="text-indigo-600 text-xs">{w.department}</p>
                <p className={`text-xs font-medium mt-1 ${getWorkloadColor(w.activeComplaintCount ?? 0)}`}>
                  Current workload: {w.activeComplaintCount ?? 0} active complaints
                </p>
              </div>
            )
          })()}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button
              onClick={handleAssign}
              disabled={!workerId || isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting
                ? <><Loader2 size={14} className="animate-spin" /> Assigning...</>
                : `Assign ${selectedIds.length} Complaints`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkAssignModal

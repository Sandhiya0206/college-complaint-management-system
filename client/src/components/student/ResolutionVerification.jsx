import { useState } from 'react'
import { X, CheckCircle2, XCircle } from 'lucide-react'
import { complaintService } from '../../services/complaint.service'
import { toast } from 'react-toastify'

/**
 * ResolutionVerification — Accept or Reject a Resolved complaint
 * Props:
 *  - complaint: complaint object (status must be 'Resolved')
 *  - onVerified(): refresh callback
 */
const ResolutionVerification = ({ complaint, onVerified }) => {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAction = async (action) => {
    if (action === 'reject' && !rejectReason.trim()) {
      toast.error('Please provide a rejection reason.')
      return
    }
    setIsSubmitting(true)
    try {
      await complaintService.verifyResolution(complaint._id, action, rejectReason)
      toast.success(action === 'accept' ? 'Resolution accepted!' : 'Resolution rejected — complaint reopened.')
      onVerified(action)
    } catch (e) {
      toast.error(e.message || 'Action failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (complaint.status !== 'Resolved') return null

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <h3 className="text-sm font-semibold text-amber-800 mb-1">Verify Resolution</h3>
      <p className="text-xs text-amber-700 mb-3">
        The worker has marked this complaint as resolved. Please verify whether the issue has been resolved satisfactorily.
      </p>

      {!showRejectForm ? (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('accept')}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            <CheckCircle2 size={13} /> Accept Resolution
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-50 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-60 transition-colors"
          >
            <XCircle size={13} /> Reject &amp; Reopen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            rows={3}
            placeholder="Describe why the resolution is unsatisfactory..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowRejectForm(false); setRejectReason('') }}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={isSubmitting || !rejectReason.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
            >
              <XCircle size={12} /> Confirm Rejection
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResolutionVerification

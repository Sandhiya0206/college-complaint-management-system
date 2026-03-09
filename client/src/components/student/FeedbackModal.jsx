import { useState } from 'react'
import { X, Star } from 'lucide-react'
import { complaintService } from '../../services/complaint.service'
import { toast } from 'react-toastify'

const StarRating = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-700">{label}</span>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`transition-transform hover:scale-110 ${n <= value ? 'text-amber-400' : 'text-gray-300'}`}
        >
          <Star size={20} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  </div>
)

/**
 * FeedbackModal — 3×5-star rating after accepting resolution
 * Props:
 *  - complaint: complaint object
 *  - onClose()
 *  - onSubmitted()
 */
const FeedbackModal = ({ complaint, onClose, onSubmitted }) => {
  const [overallRating, setOverallRating] = useState(0)
  const [responseTimeRating, setResponseTimeRating] = useState(0)
  const [qualityRating, setQualityRating] = useState(0)
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!overallRating || !responseTimeRating || !qualityRating) {
      toast.error('Please rate all three categories.')
      return
    }
    setIsSubmitting(true)
    try {
      await complaintService.submitFeedback(complaint._id, {
        overallRating,
        responseTimeRating,
        qualityRating,
        comments: comments.trim(),
      })
      toast.success('Thank you for your feedback!')
      onSubmitted()
    } catch (e) {
      toast.error(e.message || 'Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Rate the Resolution</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{complaint.complaintId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-gray-600">
            Your feedback helps us improve. Please rate your experience resolving this complaint.
          </p>

          <div className="space-y-4">
            <StarRating label="Overall Satisfaction" value={overallRating} onChange={setOverallRating} />
            <StarRating label="Response Time" value={responseTimeRating} onChange={setResponseTimeRating} />
            <StarRating label="Quality of Work" value={qualityRating} onChange={setQualityRating} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Comments <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={3}
              maxLength={500}
              placeholder="Share your experience..."
              value={comments}
              onChange={e => setComments(e.target.value)}
            />
            <span className="text-xs text-gray-400">{comments.length}/500</span>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Skip</button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !overallRating || !responseTimeRating || !qualityRating}
              className="btn-primary flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedbackModal

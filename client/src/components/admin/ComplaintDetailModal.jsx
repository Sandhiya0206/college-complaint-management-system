import { useEffect, useState } from 'react'
import { X, MapPin, User, Calendar, Brain, Image as ImageIcon, UserCog } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import StatusBadge from '../common/StatusBadge'
import PriorityBadge from '../common/PriorityBadge'
import ConfidenceBar from '../common/ConfidenceBar'
import ActivityTimeline from '../common/ActivityTimeline'
import AssignWorkerModal from './AssignWorkerModal'
import LoadingSpinner from '../common/LoadingSpinner'
import { formatDate, getCategoryIcon } from '../../utils/helpers'
import { toast } from 'react-toastify'
import GenuinenessIndicator from '../ai/GenuinenessIndicator'
import ResolutionETA from '../ai/ResolutionETA'

const STATUSES = ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Rejected']

const ComplaintDetailModal = ({ complaintId, onClose, onUpdated }) => {
  const [complaint, setComplaint] = useState(null)
  const [workers, setWorkers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAssign, setShowAssign] = useState(false)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [cData, wData] = await Promise.all([
          adminService.getComplaintById(complaintId),
          adminService.getWorkers(),
        ])
        setComplaint(cData.complaint)
        setWorkers(wData.workers || [])
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [complaintId])

  const handleStatusChange = async (status) => {
    setUpdatingStatus(true)
    try {
      await adminService.updateStatus(complaintId, { status })
      setComplaint(c => ({ ...c, status }))
      toast.success('Status updated')
      onUpdated?.()
    } catch (e) {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handlePriorityChange = async (priority) => {
    try {
      await adminService.updatePriority(complaintId, { priority })
      setComplaint(c => ({ ...c, priority }))
      toast.success('Priority updated')
      onUpdated?.()
    } catch (e) {
      toast.error('Failed to update priority')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {isLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : complaint ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{getCategoryIcon(complaint.category)}</span>
                  <h2 className="text-base font-bold text-gray-900">{complaint.title}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-indigo-600">{complaint.complaintId}</span>
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority} />
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 flex-shrink-0"><X size={18} /></button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[65vh] space-y-5">
              {/* Images */}
              {complaint.images?.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {complaint.images.map((img, i) => (
                    <img key={i} src={img} className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90" onClick={() => setLightboxImg(img)} alt="" />
                  ))}
                </div>
              )}

              {/* Admin Actions */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Admin Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Status</label>
                    <select
                      className="input-field text-sm"
                      value={complaint.status}
                      onChange={e => handleStatusChange(e.target.value)}
                      disabled={updatingStatus}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Priority</label>
                    <select
                      className="input-field text-sm"
                      value={complaint.priority}
                      onChange={e => handlePriorityChange(e.target.value)}
                    >
                      {['High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => setShowAssign(true)} className="btn-ghost w-full text-sm flex items-center justify-center gap-1.5">
                  <UserCog size={14} /> {complaint.assignedTo ? 'Reassign Worker' : 'Assign Worker'}
                </button>
                {complaint.assignedTo && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-white p-2 rounded-lg border border-gray-200">
                    <User size={12} />
                    <span>Assigned to <strong>{complaint.assignedTo.name}</strong> ({complaint.assignedTo.department})</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-400">Location</div>
                  <div className="font-medium flex items-center gap-1"><MapPin size={11} />{complaint.location}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-400">Student</div>
                  <div className="font-medium flex items-center gap-1"><User size={11} />{complaint.student?.name}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-400">Submitted</div>
                  <div className="font-medium">{formatDate(complaint.createdAt)}</div>
                </div>
              </div>

              {/* AI Analysis */}
              {complaint.aiAnalysis && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-violet-700 mb-2 flex items-center gap-1.5"><Brain size={14} /> AI Analysis</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div><span className="text-gray-400">Detected:</span><div className="font-medium">{complaint.aiAnalysis.suggestedCategory}</div></div>
                    <div><span className="text-gray-400">Method:</span><div className="font-medium">{complaint.aiAnalysis.method}</div></div>
                    {complaint.aiAnalysis.studentOverrode && (
                      <div className="col-span-2"><span className="badge bg-orange-100 text-orange-700 border-orange-200 text-[10px]">Student overrode AI suggestion</span></div>
                    )}
                  </div>
                  <ConfidenceBar confidence={complaint.aiAnalysis.confidence} />
                  {complaint.aiAnalysis.detectedObjects?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {complaint.aiAnalysis.detectedObjects.slice(0, 6).map((o, i) => (
                        <span key={i} className="text-[11px] bg-white border border-violet-200 rounded-full px-2 py-0.5 text-violet-600">{o.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {complaint.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">{complaint.description}</p>
                </div>
              )}

              {/* Feature #5: ETA + Feature #16: Genuineness */}
              <div className="flex flex-wrap gap-2">
                {complaint.etaHours && !['Resolved','Rejected'].includes(complaint.status) && (
                  <ResolutionETA etaHours={complaint.etaHours} etaConfidence={complaint.etaConfidence} etaBasedOn={complaint.etaBasedOn} compact />
                )}
                {complaint.genuinenessScore !== undefined && (
                  <GenuinenessIndicator score={complaint.genuinenessScore} verdict={complaint.genuinenessVerdict} flags={complaint.genuinenessFlags} compact />
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Timeline</h3>
                <ActivityTimeline history={complaint.statusHistory} />
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">Complaint not found</div>
        )}
      </div>

      {showAssign && complaint && (
        <AssignWorkerModal
          complaint={complaint}
          workers={workers}
          onClose={() => setShowAssign(false)}
          onAssigned={() => {
            setShowAssign(false)
            onUpdated?.()
            onClose()
          }}
        />
      )}

      {lightboxImg && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  )
}

export default ComplaintDetailModal

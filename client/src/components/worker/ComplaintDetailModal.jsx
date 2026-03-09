import { useEffect, useState } from 'react'
import { X, MapPin, User, Calendar, Brain, Image as ImageIcon } from 'lucide-react'
import { workerService } from '../../services/worker.service'
import StatusBadge from '../common/StatusBadge'
import PriorityBadge from '../common/PriorityBadge'
import ConfidenceBar from '../common/ConfidenceBar'
import ActivityTimeline from '../common/ActivityTimeline'
import LoadingSpinner from '../common/LoadingSpinner'
import { formatDate, getCategoryIcon } from '../../utils/helpers'

const ComplaintDetailModal = ({ complaintId, onClose, onStartWork, onResolve }) => {
  const [complaint, setComplaint] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lightboxImg, setLightboxImg] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await workerService.getComplaintById(complaintId)
        setComplaint(data.complaint)
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [complaintId])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {isLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : complaint ? (
          <>
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{getCategoryIcon(complaint.category)}</span>
                  <h2 className="text-lg font-bold text-gray-900">{complaint.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-indigo-600">{complaint.complaintId}</span>
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority} />
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
              {complaint.images?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><ImageIcon size={14} /> Photos</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {complaint.images.map((img, i) => (
                      <img key={i} src={img} className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90" onClick={() => setLightboxImg(img)} alt="" />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-400">Location</div>
                  <div className="text-sm font-medium flex items-center gap-1"><MapPin size={12} />{complaint.location}</div>
                </div>
                {complaint.student && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-400">Reported by</div>
                    <div className="text-sm font-medium flex items-center gap-1"><User size={12} />{complaint.student.name}</div>
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-400">Submitted</div>
                  <div className="text-sm font-medium flex items-center gap-1"><Calendar size={12} />{formatDate(complaint.createdAt)}</div>
                </div>
              </div>

              {complaint.aiAnalysis && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-violet-700 mb-2 flex items-center gap-1.5"><Brain size={14} /> AI Analysis</h3>
                  <ConfidenceBar confidence={complaint.aiAnalysis.confidence} />
                  {complaint.aiAnalysis.detectedObjects?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {complaint.aiAnalysis.detectedObjects.slice(0, 5).map((o, i) => (
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

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Timeline</h3>
                <ActivityTimeline history={complaint.statusHistory} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                {complaint.status === 'Assigned' && onStartWork && (
                  <button onClick={() => { onStartWork(complaint._id); onClose() }} className="btn-primary flex-1">⚡ Start Work</button>
                )}
                {complaint.status === 'In Progress' && onResolve && (
                  <button onClick={() => { onResolve(complaint); onClose() }} className="btn-primary flex-1 bg-green-600 hover:bg-green-700">✅ Mark Resolved</button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">Complaint not found</div>
        )}
      </div>

      {lightboxImg && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"><X size={20} /></button>
        </div>
      )}
    </div>
  )
}

export default ComplaintDetailModal

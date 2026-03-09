import { useEffect, useState } from 'react'
import { X, MapPin, User, Calendar, Brain, Image as ImageIcon, Download, Video, Home, Hash, AlertTriangle } from 'lucide-react'
import { complaintService } from '../../services/complaint.service'
import StatusBadge from '../common/StatusBadge'
import PriorityBadge from '../common/PriorityBadge'
import ConfidenceBar from '../common/ConfidenceBar'
import ActivityTimeline from '../common/ActivityTimeline'
import LoadingSpinner from '../common/LoadingSpinner'
import SLATimer from '../common/SLATimer'
import TranslateButton from '../common/TranslateButton'
import ResolutionVerification from './ResolutionVerification'
import FeedbackModal from './FeedbackModal'
import ResolutionETA from '../ai/ResolutionETA'
import { formatDate, getCategoryIcon } from '../../utils/helpers'
import { generateComplaintPDF } from '../../utils/pdfGenerator'

const ComplaintDetailModal = ({ complaintId, onClose }) => {
  const [complaint, setComplaint] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [translatedDesc, setTranslatedDesc] = useState(null)
  const [translatedLang, setTranslatedLang] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)

  const load = async () => {
    try {
      setIsLoading(true)
      const data = await complaintService.getComplaintById(complaintId)
      setComplaint(data.complaint)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [complaintId])

  const handleVerified = (action) => {
    if (action === 'accept') setShowFeedback(true)
    load()
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
                  <span className="text-2xl">{getCategoryIcon(complaint.category)}</span>
                  <h2 className="text-lg font-bold text-gray-900">{complaint.title || complaint.category}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-indigo-600">{complaint.complaintId}</span>
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority} />
                  {complaint.isEscalated && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">
                      <AlertTriangle size={9} /> Escalated
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateComplaintPDF(complaint)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                  title="Download PDF"
                >
                  <Download size={12} /> PDF
                </button>
                <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-120px)]">

              {/* SLA Timer */}
              {complaint.slaDeadline && complaint.status !== 'Completed' && (
                <SLATimer deadline={complaint.slaDeadline} />
              )}

              {/* Images */}
              {complaint.images?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <ImageIcon size={14} /> Images
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {complaint.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 border border-gray-200"
                        onClick={() => setLightboxImg(img)}
                        alt={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Videos */}
              {complaint.videos?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Video size={14} /> Videos
                  </h3>
                  <div className="space-y-2">
                    {complaint.videos.map((vid, i) => (
                      <video key={i} src={vid} controls className="w-full rounded-xl border border-gray-200 max-h-48" />
                    ))}
                  </div>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-400 mb-0.5">Location</div>
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <MapPin size={12} />{complaint.location || 'N/A'}
                  </div>
                </div>
                {complaint.hostelBlock && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-400 mb-0.5">Hostel Block & Room</div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      <Home size={12} />{complaint.hostelBlock}
                      {complaint.roomNumber && <><Hash size={12} />{complaint.roomNumber}</>}
                    </div>
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-400 mb-0.5">Submitted</div>
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <Calendar size={12} />{formatDate(complaint.createdAt)}
                  </div>
                </div>
                {complaint.assignedTo && (
                  <div className="p-3 bg-indigo-50 rounded-xl col-span-2">
                    <div className="text-xs text-indigo-400 mb-0.5">Assigned Worker</div>
                    <div className="text-sm font-medium text-indigo-700 flex items-center gap-1">
                      <User size={12} />
                      {complaint.assignedTo.name}
                      {complaint.assignedTo.department && ` (${complaint.assignedTo.department})`}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Analysis */}
              {complaint.aiAnalysis && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-violet-700 mb-3 flex items-center gap-1.5">
                    <Brain size={14} /> AI Analysis
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <span className="text-xs text-gray-400">Detected:</span>
                      <div className="font-medium">{complaint.aiAnalysis.suggestedCategory}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Method:</span>
                      <div className="font-medium text-xs">{complaint.aiAnalysis.method}</div>
                    </div>
                  </div>
                  <ConfidenceBar confidence={complaint.aiAnalysis.confidence} />
                  {complaint.aiAnalysis.detectedObjects?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {complaint.aiAnalysis.detectedObjects.slice(0, 5).map((obj, i) => (
                        <span key={i} className="text-[11px] bg-white border border-violet-200 rounded-full px-2 py-0.5 text-violet-600">
                          {obj.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {complaint.description && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">Description</h3>
                    <TranslateButton
                      text={complaint.description}
                      onTranslated={(t, lang) => { setTranslatedDesc(t); setTranslatedLang(lang) }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                    {complaint.description}
                  </p>
                  {translatedDesc && (
                    <div className="mt-2 bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                      <p className="text-xs text-indigo-400 mb-1">Translated to {translatedLang}:</p>
                      <p className="text-sm text-indigo-800">{translatedDesc}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Feature #5: Resolution ETA */}
              {complaint.etaHours && !['Resolved','Rejected','Completed'].includes(complaint.status) && (
                <ResolutionETA
                  etaHours={complaint.etaHours}
                  etaConfidence={complaint.etaConfidence}
                  etaBasedOn={complaint.etaBasedOn}
                />
              )}

              {/* Worker Remarks & Proof */}
              {(() => {
                const resolvedEntry = complaint.statusHistory?.find(h => h.status === 'Resolved' && h.remarks)
                if (!resolvedEntry) return null
                return (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <h3 className="text-sm font-semibold text-green-700 mb-2">Worker Remarks</h3>
                    <p className="text-sm text-green-800">{resolvedEntry.remarks}</p>
                    {resolvedEntry.proofImages?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-green-600 mb-1.5">Resolution Photos:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {resolvedEntry.proofImages.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 border border-green-200"
                              onClick={() => setLightboxImg(img)}
                              alt="Proof"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Resolution Verification */}
              {complaint.status === 'Resolved' && complaint.verificationStatus !== 'accepted' && (
                <ResolutionVerification complaint={complaint} onVerified={handleVerified} />
              )}

              {/* Completed badge */}
              {complaint.status === 'Completed' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium text-center">
                  Complaint completed and verified
                </div>
              )}

              {/* Timeline */}
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

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Full size" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && complaint && (
        <FeedbackModal
          complaint={complaint}
          onClose={() => setShowFeedback(false)}
          onSubmitted={() => { setShowFeedback(false); load() }}
        />
      )}
    </div>
  )
}

export default ComplaintDetailModal

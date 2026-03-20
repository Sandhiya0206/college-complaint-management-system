import { useEffect, useState } from 'react'
import { X, MapPin, User, Calendar, Brain, Image as ImageIcon, Languages, Volume2, Square } from 'lucide-react'
import { workerService } from '../../services/worker.service'
import StatusBadge from '../common/StatusBadge'
import PriorityBadge from '../common/PriorityBadge'
import ConfidenceBar from '../common/ConfidenceBar'
import ActivityTimeline from '../common/ActivityTimeline'
import LoadingSpinner from '../common/LoadingSpinner'
import { formatDate, getCategoryIcon } from '../../utils/helpers'
import { translateText } from '../../utils/translator'

const ComplaintDetailModal = ({ complaintId, onClose, onStartWork, onResolve }) => {
  const [complaint, setComplaint] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [translatedDescription, setTranslatedDescription] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [isSpeakingTamil, setIsSpeakingTamil] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    const runTamilTranslation = async () => {
      const source = complaint?.description?.trim()
      setTranslatedDescription('')
      setTranslationError('')

      if (!source) return

      setIsTranslating(true)
      try {
        const tamil = await translateText(source, 'ta', 'en')
        if (!cancelled) setTranslatedDescription(tamil || source)
      } catch (_) {
        if (!cancelled) {
          setTranslationError('Tamil translation unavailable right now.')
          setTranslatedDescription(source)
        }
      } finally {
        if (!cancelled) setIsTranslating(false)
      }
    }

    runTamilTranslation()

    return () => {
      cancelled = true
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [complaint?.description])

  const speakTamilTranslation = () => {
    if (!translatedDescription?.trim()) return
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setTranslationError('Voice playback is not supported in this browser.')
      return
    }

    const utterance = new SpeechSynthesisUtterance(translatedDescription)
    utterance.lang = 'ta-IN'

    // Get voices (may need to wait for them to load)
    let voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) {
      // Voices may not be loaded yet, try again after a short delay
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices()
        selectAndSpeak(utterance)
      }
    } else {
      selectAndSpeak(utterance)
    }

    function selectAndSpeak(utterance) {
      const voices = window.speechSynthesis.getVoices()
      
      // Try to find Tamil voice in order of specificity
      let selectedVoice = null
      
      // First try: exact Tamil matches
      selectedVoice = voices.find(v => {
        const lang = String(v.lang || '').toLowerCase()
        const name = String(v.name || '').toLowerCase()
        return lang === 'ta' || lang === 'ta-in' || (name.includes('tamil') && lang.startsWith('ta'))
      })
      
      // Second try: any Ta-* language
      if (!selectedVoice) {
        selectedVoice = voices.find(v => String(v.lang || '').toLowerCase().startsWith('ta'))
      }
      
      // Third try: any Indian voice (Hindi, Malayalam, Kannada, Telugu, etc)
      if (!selectedVoice) {
        selectedVoice = voices.find(v => {
          const lang = String(v.lang || '').toLowerCase()
          return lang.startsWith('hi') || lang.startsWith('ml') || lang.startsWith('kn') || lang.startsWith('te')
        })
      }
      
      // Last resort: just use any available voice
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0]
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

      // Set natural speech parameters
      utterance.rate = 0.9 // Slightly slower for clarity
      utterance.pitch = 1.0 // Natural pitch
      utterance.volume = 1.0 // Full volume

      utterance.onstart = () => setIsSpeakingTamil(true)
      utterance.onend = () => setIsSpeakingTamil(false)
      utterance.onerror = (err) => {
        setIsSpeakingTamil(false)
        console.error('Speech synthesis error:', err)
        setTranslationError('Voice playback not available. Please check browser speech settings or install Tamil language pack.')
      }

      window.speechSynthesis.cancel()
      setTimeout(() => {
        window.speechSynthesis.speak(utterance)
      }, 100)
    }
  }

  const stopTamilVoice = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeakingTamil(false)
  }

  return (
    <div className="modal-overlay items-start overflow-y-auto py-4" onClick={onClose}>
      <div className="modal-content flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {isLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : complaint ? (
          <>
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{getCategoryIcon(complaint.category)}</span>
                  <h2 className="text-lg font-bold text-slate-900">{complaint.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-indigo-600">{complaint.complaintId}</span>
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority} />
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-gray-500"><X size={18} /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
              {complaint.images?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5"><ImageIcon size={14} /> Photos</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {complaint.images.map((img, i) => (
                      <img key={i} src={img} className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90" onClick={() => setLightboxImg(img)} alt="" />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-1"><MapPin size={12} />{complaint.location}</div>
                </div>
                {complaint.student && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-xs text-gray-500">Reported by</div>
                    <div className="text-sm font-medium text-slate-800 flex items-center gap-1"><User size={12} />{complaint.student.name}</div>
                  </div>
                )}
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="text-xs text-gray-500">Submitted</div>
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-1"><Calendar size={12} />{formatDate(complaint.createdAt)}</div>
                </div>
              </div>

              {complaint.aiAnalysis && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-violet-700 mb-2 flex items-center gap-1.5"><Brain size={14} /> AI Analysis</h3>
                  <ConfidenceBar confidence={complaint.aiAnalysis.confidence} />
                  {complaint.aiAnalysis.detectedObjects?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {complaint.aiAnalysis.detectedObjects.slice(0, 5).map((o, i) => (
                        <span key={i} className="text-[11px] bg-white border border-violet-200 rounded-full px-2 py-0.5 text-violet-700">{o.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {complaint.description && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Description</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 p-3 rounded-xl">{complaint.description}</p>

                  <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
                        <Languages size={14} /> Tamil Translation
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={speakTamilTranslation}
                          disabled={!translatedDescription || isTranslating}
                          className="text-xs px-2.5 py-1 rounded-lg border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <Volume2 size={12} /> Voice Tamil
                        </button>
                        {isSpeakingTamil && (
                          <button
                            type="button"
                            onClick={stopTamilVoice}
                            className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 flex items-center gap-1"
                          >
                            <Square size={11} /> Stop
                          </button>
                        )}
                      </div>
                    </div>

                    {isTranslating ? (
                      <p className="text-xs text-indigo-600">Translating description to Tamil...</p>
                    ) : (
                      <p className="text-sm text-indigo-900">{translatedDescription || 'Translation unavailable.'}</p>
                    )}

                    {translationError && <p className="text-xs text-red-600 mt-1">{translationError}</p>}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Status Timeline</h3>
                <ActivityTimeline history={complaint.statusHistory} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-slate-200">
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

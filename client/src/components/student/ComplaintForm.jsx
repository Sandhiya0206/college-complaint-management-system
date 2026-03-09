import { useState, useEffect, useRef } from 'react'
import {
  X, Loader2, MapPin, FileText, CheckCircle2, Brain,
  Sparkles, AlertTriangle, Zap, Cloud, ChevronDown, ChevronUp,
  Video, Image, Tag, Pencil, ArrowRight, BookOpen
} from 'lucide-react'
import { complaintService } from '../../services/complaint.service'
import ImageClassifier from '../ai/ImageClassifier'
import SeverityAlert from '../ai/SeverityAlert'
import DuplicateWarning from '../ai/DuplicateWarning'
import GenuinenessIndicator from '../ai/GenuinenessIndicator'
import { toast } from 'react-toastify'
import { analyzeText, mergeImageAndText, calculatePriority } from '../../utils/aiMapper'
import { CATEGORIES, CATEGORY_ICONS } from '../../utils/constants'

/* ─── Location types ─── */
const LOCATION_TYPES = [
  { id:'hostel',    label:'Hostel Room',       icon:'🏠', color:'indigo', fields:['hostelBlock','roomNumber'] },
  { id:'classroom', label:'Classroom / Lab',   icon:'📚', color:'blue',   fields:['buildingName','roomNumber'] },
  { id:'bathroom',  label:'Bathroom / Washroom',icon:'🚿', color:'teal',   fields:['buildingName','floorNumber','gender'] },
  { id:'cafeteria', label:'Cafeteria / Mess',  icon:'🍽️', color:'orange', fields:['buildingName','section'] },
  { id:'library',   label:'Library',           icon:'📖', color:'purple', fields:['floorNumber','section'] },
  { id:'office',    label:'Admin / Office',    icon:'🏢', color:'gray',   fields:['buildingName','roomNumber'] },
  { id:'lab',       label:'Computer Lab',      icon:'💻', color:'violet', fields:['buildingName','roomNumber'] },
  { id:'corridor',  label:'Corridor / Common', icon:'🚶', color:'amber',  fields:['buildingName','floorNumber'] },
  { id:'outdoor',   label:'Outdoor / Campus',  icon:'🌳', color:'green',  fields:['landmark'] },
  { id:'other',     label:'Other',             icon:'📍', color:'slate',  fields:['customLocation'] },
]

const HOSTEL_BLOCKS = ['Block A','Block B','Block C','Block D','Block E','Block F','Girls Hostel','PG Hostel','Other']
const BUILDINGS     = ['Main Block','A Block','B Block','C Block','Science Block','Arts Block','Engineering Wing','Admin Block','Other']
const FLOORS        = ['Ground Floor','1st Floor','2nd Floor','3rd Floor','4th Floor','Terrace / Rooftop']
const GENDERS       = ['Boys','Girls','Common / Unisex']
const SECTIONS      = ['Section A','Section B','North Wing','South Wing','East Wing','West Wing','Near Entrance','Near Exit','Other']

const PRIORITY_META = {
  High:   { color:'text-red-600',   bg:'bg-red-50',    border:'border-red-300',   dot:'bg-red-500',   gradient:'from-red-500 to-rose-600',    glow:'shadow-red-100'   },
  Medium: { color:'text-amber-600', bg:'bg-amber-50',  border:'border-amber-300', dot:'bg-amber-500', gradient:'from-amber-500 to-orange-500', glow:'shadow-amber-100' },
  Low:    { color:'text-green-600', bg:'bg-green-50',  border:'border-green-300', dot:'bg-green-500', gradient:'from-green-500 to-emerald-600',glow:'shadow-green-100' },
}

const METHOD_META = {
  grok:             { label:'Grok Vision AI',   icon:'⚡', bg:'bg-rose-600'   },
  gemini:           { label:'Gemini Vision',    icon:'☁️', bg:'bg-blue-600'   },
  tensorflow:       { label:'TensorFlow.js',    icon:'⚡', bg:'bg-violet-600' },
  text_analysis:    { label:'Text Analysis',    icon:'🧠', bg:'bg-teal-600'   },
  keyword_fallback: { label:'Keyword Match',    icon:'🧠', bg:'bg-gray-500'   },
}

const locColorClass = (id) => {
  const t = LOCATION_TYPES.find(l => l.id === id)
  const map = {
    indigo:'border-indigo-400 bg-indigo-50 text-indigo-700', blue:'border-blue-400 bg-blue-50 text-blue-700',
    teal:'border-teal-400 bg-teal-50 text-teal-700',         orange:'border-orange-400 bg-orange-50 text-orange-700',
    purple:'border-purple-400 bg-purple-50 text-purple-700', gray:'border-gray-400 bg-gray-50 text-gray-700',
    violet:'border-violet-400 bg-violet-50 text-violet-700', amber:'border-amber-400 bg-amber-50 text-amber-700',
    green:'border-green-400 bg-green-50 text-green-700',     slate:'border-slate-400 bg-slate-50 text-slate-700',
  }
  return map[t?.color] || map.slate
}

const buildLocationString = (locType, locFields, note) => {
  if (!locType) return note || ''
  const t = LOCATION_TYPES.find(l => l.id === locType)
  const parts = []
  if (locFields.buildingName)   parts.push(locFields.buildingName)
  if (locFields.hostelBlock)    parts.push(locFields.hostelBlock)
  if (locFields.floorNumber)    parts.push(locFields.floorNumber)
  if (locFields.roomNumber)     parts.push('Room ' + locFields.roomNumber)
  if (locFields.gender)         parts.push(locFields.gender + ' Side')
  if (locFields.section)        parts.push(locFields.section)
  if (locFields.landmark)       parts.push('Near ' + locFields.landmark)
  if (locFields.customLocation) parts.push(locFields.customLocation)
  if (note?.trim())             parts.push(note.trim())
  return parts.length ? t.label + ' — ' + parts.join(', ') : t.label
}

const STEPS = [
  { n:1, label:'Category' },
  { n:2, label:'Location' },
  { n:3, label:'Details'  },
  { n:4, label:'Evidence' },
  { n:5, label:'Preview'  },
]

const StepDot = ({ n, active, done, label, onClick }) => (
  <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 select-none">
    <div className={"w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 " + (
      done  ? 'bg-indigo-600 border-indigo-600 text-white' :
      active? 'bg-white border-indigo-500 text-indigo-600 ring-4 ring-indigo-100 scale-110' :
              'bg-white border-gray-300 text-gray-400')}>
      {done ? '✓' : n}
    </div>
    <span className={"text-[9px] font-semibold hidden sm:block whitespace-nowrap " + (active?'text-indigo-100':done?'text-indigo-200':'text-white/40')}>{label}</span>
  </button>
)
/* ══════════ MAIN COMPONENT ══════════ */
const ComplaintForm = ({ onSuccess, onClose }) => {
  const [step, setStep] = useState(1)

  /* AI & Category */
  const [files, setFiles]                     = useState([])
  const [videoFiles, setVideoFiles]           = useState([])
  const [imageAiResult, setImageAiResult]     = useState(null)
  const [textAiResult, setTextAiResult]       = useState(null)
  const [mergedResult, setMergedResult]       = useState(null)
  const [manualCategory, setManualCategory]   = useState('')
  const [showCatGrid, setShowCatGrid]         = useState(false)

  /* Location */
  const [locationType, setLocationType]       = useState('')
  const [locFields, setLocFields]             = useState({})
  const [locationNote, setLocationNote]       = useState('')

  /* Details */
  const [complainTitle, setComplainTitle]     = useState('')
  const [description, setDescription]        = useState('')

  /* Submit */
  const [isSubmitting, setIsSubmitting]       = useState(false)
  const [submitted, setSubmitted]             = useState(false)
  const [submittedData, setSubmittedData]     = useState(null)

  /* AI enrichment state */
  const [duplicateMatches, setDuplicateMatches] = useState([])
  const [dupChecked, setDupChecked]             = useState(false)
  const [genuineness, setGenuineness]           = useState(null)

  const textTimer = useRef(null)

  /* Live text AI */
  useEffect(() => {
    const combined = (locationNote + ' ' + description).trim()
    clearTimeout(textTimer.current)
    if (combined.length < 4) { setTextAiResult(null); return }
    textTimer.current = setTimeout(() => setTextAiResult(analyzeText(combined)), 400)
    return () => clearTimeout(textTimer.current)
  }, [locationNote, description])

  useEffect(() => {
    setMergedResult(mergeImageAndText(imageAiResult, textAiResult))
  }, [imageAiResult, textAiResult])

  const finalCategory = manualCategory || mergedResult?.category || ''
  const finalPriority = finalCategory
    ? calculatePriority(finalCategory, mergedResult?.confidence ?? 0.6, mergedResult?.detectedObjects ?? [], description)
    : mergedResult?.priority || ''

  const handleCategoryDetected = (result) => { setImageAiResult(result); setManualCategory('') }
  const setField = (k, v) => setLocFields(prev => ({ ...prev, [k]: v }))
  const fullLocation = buildLocationString(locationType, locFields, locationNote)

  /* Step validation */
  const canGoNext = (s) => {
    if (s === 1) return !!finalCategory
    if (s === 2) return !!locationType && !!fullLocation
    if (s === 3) return complainTitle.trim().length >= 5 && description.trim().length >= 10
    return true
  }

  /* Submit handler */
  const handleSubmit = async () => {
    if (!fullLocation.trim()) { toast.error('Location is required'); return }
    if (!finalCategory)       { toast.error('Category is required — upload a photo or pick manually'); return }
    if (!complainTitle.trim()) { toast.error('Title is required'); return }

    const aiPayload = mergedResult
      ? { ...mergedResult, category: finalCategory, priority: finalPriority, studentOverrode: !!manualCategory }
      : null

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('images', f))
      videoFiles.forEach(f => formData.append('videos', f))
      formData.append('location', fullLocation)
      formData.append('title', complainTitle.trim())
      formData.append('locationType', locationType)
      if (locFields.hostelBlock) formData.append('hostelBlock', locFields.hostelBlock)
      if (locFields.roomNumber)  formData.append('roomNumber', locFields.roomNumber)
      Object.entries(locFields).forEach(([k,v]) => v && formData.append(k, v))
      if (description)  formData.append('description', description)
      if (aiPayload)    formData.append('aiData', JSON.stringify(aiPayload))
      if (manualCategory) formData.append('category_override', manualCategory)

      const data = await complaintService.createComplaint(formData)
      setSubmitted(true)
      setSubmittedData(data)
      toast.success(data.message || 'Complaint submitted!')
      onSuccess?.(data.complaint)
    } catch (err) {
      toast.error(err.message || 'Failed to submit')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pm   = PRIORITY_META[finalPriority]
  const mm   = METHOD_META[mergedResult?.method] || METHOD_META.keyword_fallback
  const conf = Math.round((mergedResult?.confidence || 0) * 100)
  const curLocType = LOCATION_TYPES.find(l => l.id === locationType)

  /* ── Success screen ── */
  if (submitted && submittedData) {
    const w = submittedData.assignedWorker || submittedData.complaint?.assignedTo
    return (
      <div className="flex flex-col items-center text-center py-10 px-6 gap-5">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-200">
            <CheckCircle2 size={48} className="text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
            <Sparkles size={13} className="text-white" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Complaint Submitted!</h3>
          <p className="text-gray-500 text-sm">Tracking ID: <span className="font-mono font-bold text-indigo-600">{submittedData.complaint?.complaintId}</span></p>
        </div>
        {finalPriority && pm && (
          <div className={"inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border " + pm.bg + " " + pm.color + " " + pm.border}>
            <span className={"w-2 h-2 rounded-full " + pm.dot} />
            {finalPriority} Priority &bull; {finalCategory}
          </div>
        )}
        {w ? (
          <div className="w-full bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                {(w.name||'W')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-[11px] text-green-600 font-bold uppercase tracking-wide">&#9889; Auto-Assigned</p>
                <p className="font-bold text-gray-900">{w.name}</p>
                <p className="text-xs text-gray-500">{w.department || w.email}</p>
              </div>
              <CheckCircle2 size={22} className="ml-auto text-green-500" />
            </div>
          </div>
        ) : (
          <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700 text-left">
            &#128203; Your complaint is <strong>queued for manual assignment</strong> by an admin. You will be notified shortly.
          </div>
        )}
        <button onClick={onClose} className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-all">
          Done
        </button>
      </div>
    )
  }

  /* ── Main form ── */
  return (
    <div className="flex flex-col" style={{minHeight:'520px', maxHeight:'90vh'}}>

      {/* ════ HEADER GRADIENT ════ */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 px-5 pt-5 pb-4 rounded-t-2xl flex-shrink-0 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 15% 50%, white 0%, transparent 55%)'}} />
        <div className="relative flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-yellow-300" />
              <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">AI-Powered</span>
            </div>
            <h2 className="text-xl font-extrabold text-white leading-tight">New Complaint</h2>
            <p className="text-indigo-200 text-[11px] mt-0.5">AI detects category &amp; auto-assigns a worker</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors">
              <X size={17} />
            </button>
          )}
        </div>
        {/* Step bar */}
        <div className="relative flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex-1 flex items-center">
              <StepDot n={s.n} active={step===s.n} done={step>s.n} label={s.label}
                onClick={() => { if (s.n < step || (s.n === step+1 && canGoNext(step))) setStep(s.n) }} />
              {i < STEPS.length-1 && (
                <div className={"flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 " + (step>s.n ? 'bg-indigo-300':'bg-white/20')} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ════ SCROLLABLE BODY ════ */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-gray-50">

        {/* ─── STEP 1: CATEGORY ─── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-center text-xs text-gray-400">Upload a photo for instant AI detection, or describe the issue below</p>

            {/* Image upload — optional badge */}
            <div className="relative">
              <div className="absolute -top-2 right-3 z-10">
                <span className="text-[9px] bg-green-100 text-green-700 border border-green-300 rounded-full px-2 py-0.5 font-bold">OPTIONAL</span>
              </div>
              <ImageClassifier onCategoryDetected={handleCategoryDetected} onFilesChange={setFiles} />
            </div>

            {/* AI result or placeholder */}
            {finalCategory ? (
              <div className={"rounded-2xl border-2 overflow-hidden shadow-lg " + (pm ? pm.border + " " + pm.glow : "border-violet-300")}>
                <div className={"px-4 py-2.5 flex items-center justify-between " + mm.bg}>
                  <span className="text-white text-xs font-bold flex items-center gap-1.5">{mm.icon} {mm.label}</span>
                  <span className="text-white/80 text-xs">{conf}% confidence</span>
                </div>
                <div className="bg-white px-4 py-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl leading-none">{CATEGORY_ICONS[finalCategory]||'📋'}</span>
                    <div>
                      <p className="text-xl font-black text-gray-900">{finalCategory}</p>
                      {finalPriority && pm && (
                        <span className={"inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-xs font-bold border " + pm.bg + " " + pm.color + " " + pm.border}>
                          <span className={"w-2 h-2 rounded-full " + pm.dot}/>{finalPriority} Priority
                        </span>
                      )}
                    </div>
                    {manualCategory && <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5">&#9998; Manual</span>}
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>AI Confidence</span><span>{conf}%</span></div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={"h-full rounded-full transition-all duration-700 " + (conf>=70?'bg-green-500':conf>=50?'bg-violet-500':'bg-amber-400')} style={{width:conf+'%'}} />
                    </div>
                  </div>
                  {mergedResult?.reason && (
                    <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 italic">&#128172; &quot;{mergedResult.reason}&quot;</p>
                  )}
                  {conf > 0 && conf < 45 && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                      <AlertTriangle size={12}/> Low confidence — verify or pick a category below
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 px-4 py-8 text-center">
                <div className="text-4xl mb-2">🤖</div>
                <p className="text-sm font-bold text-violet-700">AI will auto-detect category &amp; priority</p>
                <p className="text-xs text-gray-400 mt-1">Upload a photo — or type the issue below</p>
              </div>
            )}

            {/* Text description for AI */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5">
                <Zap size={11} className="text-violet-500"/> Quick Description <span className="text-gray-400 font-normal">(AI reads in real-time)</span>
              </label>
              <textarea rows={2}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-300 focus:border-violet-400 resize-none transition-all"
                placeholder={'e.g. "Fan not working in room 204" or "Water leaking under the sink"'}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Category manual pick */}
            <div>
              <button type="button" onClick={() => setShowCatGrid(v=>!v)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-violet-200 bg-violet-50 rounded-xl text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors">
                <span className="flex items-center gap-1.5">
                  <Tag size={12}/> {finalCategory ? 'Override AI Category' : 'Pick Category Manually'}
                </span>
                {showCatGrid ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
              </button>
              {showCatGrid && (
                <div className="grid grid-cols-3 gap-2 mt-2.5">
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button"
                      onClick={() => { setManualCategory(cat===manualCategory?'':cat); setShowCatGrid(false) }}
                      className={"flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.03] " + (
                        manualCategory===cat || (!manualCategory&&finalCategory===cat)
                          ? 'border-violet-500 bg-violet-600 text-white shadow-md'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:bg-violet-50'
                      )}>
                      <span className="text-2xl leading-none">{CATEGORY_ICONS[cat]||'📋'}</span>
                      <span className="leading-tight text-center">{cat}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 2: LOCATION ─── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-center text-xs text-gray-400">Where exactly is the problem located?</p>

            {/* Location type picker */}
            <div className="grid grid-cols-2 gap-2.5">
              {LOCATION_TYPES.map(lt => (
                <button key={lt.id} type="button"
                  onClick={() => { setLocationType(lt.id); setLocFields({}) }}
                  className={"flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02] " + (
                    locationType === lt.id
                      ? locColorClass(lt.id) + ' shadow-md scale-[1.02]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}>
                  <span className="text-xl flex-shrink-0">{lt.icon}</span>
                  <span className="text-xs font-semibold leading-tight">{lt.label}</span>
                  {locationType===lt.id && <CheckCircle2 size={13} className="ml-auto flex-shrink-0"/>}
                </button>
              ))}
            </div>

            {/* Dynamic sub-fields based on location type */}
            {curLocType && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-2">
                  <span className="text-lg">{curLocType.icon}</span>
                  {curLocType.label} — Specific Details
                </p>

                {curLocType.fields.includes('hostelBlock') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Hostel Block <span className="text-red-400">*</span></label>
                    <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                      value={locFields.hostelBlock||''} onChange={e=>setField('hostelBlock',e.target.value)}>
                      <option value="">Select block…</option>
                      {HOSTEL_BLOCKS.map(b=><option key={b}>{b}</option>)}
                    </select>
                  </div>
                )}

                {curLocType.fields.includes('buildingName') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Building / Block</label>
                    <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                      value={locFields.buildingName||''} onChange={e=>setField('buildingName',e.target.value)}>
                      <option value="">Select building…</option>
                      {BUILDINGS.map(b=><option key={b}>{b}</option>)}
                    </select>
                  </div>
                )}

                {curLocType.fields.includes('floorNumber') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Floor</label>
                    <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                      value={locFields.floorNumber||''} onChange={e=>setField('floorNumber',e.target.value)}>
                      <option value="">Select floor…</option>
                      {FLOORS.map(f=><option key={f}>{f}</option>)}
                    </select>
                  </div>
                )}

                {curLocType.fields.includes('roomNumber') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      {locationType==='hostel' ? 'Room Number *' : 'Room / Lab Number'}
                    </label>
                    <input type="text"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                      placeholder={locationType==='hostel' ? 'e.g. 204, G-12' : 'e.g. 101 or Lab-3'}
                      value={locFields.roomNumber||''}
                      onChange={e=>setField('roomNumber',e.target.value)}
                    />
                  </div>
                )}

                {curLocType.fields.includes('gender') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Washroom Type</label>
                    <div className="flex gap-2">
                      {GENDERS.map(g=>(
                        <button key={g} type="button"
                          onClick={()=>setField('gender',g)}
                          className={"flex-1 py-2 text-xs rounded-xl border font-semibold transition-all " + (locFields.gender===g
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:bg-teal-50')}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {curLocType.fields.includes('section') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Section / Area</label>
                    <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                      value={locFields.section||''} onChange={e=>setField('section',e.target.value)}>
                      <option value="">Select section…</option>
                      {SECTIONS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {curLocType.fields.includes('landmark') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Landmark / Area Description <span className="text-red-400">*</span></label>
                    <input type="text"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                      placeholder="e.g. Near canteen gate, Behind the library"
                      value={locFields.landmark||''}
                      onChange={e=>setField('landmark',e.target.value)}
                    />
                  </div>
                )}

                {curLocType.fields.includes('customLocation') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Describe Location <span className="text-red-400">*</span></label>
                    <input type="text"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                      placeholder="e.g. Storage room next to the principal office"
                      value={locFields.customLocation||''}
                      onChange={e=>setField('customLocation',e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Additional Note <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input type="text"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    placeholder="Any extra detail to pinpoint the exact spot…"
                    value={locationNote}
                    onChange={e=>setLocationNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            {fullLocation && (
              <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 text-xs text-indigo-700">
                <MapPin size={13} className="mt-0.5 flex-shrink-0 text-indigo-500"/>
                <span className="font-semibold">{fullLocation}</span>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: DETAILS ─── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Pencil size={12} className="text-indigo-500"/> Complaint Title <span className="text-red-400">*</span></span>
                <span className="text-gray-400 font-normal">{complainTitle.length}/120</span>
              </label>
              <input type="text"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                placeholder={curLocType ? '"' + (finalCategory||'Issue') + ' in ' + curLocType.label + '"' : '"Broken fan in Room 204"'}
                maxLength={120}
                value={complainTitle}
                onChange={e=>setComplainTitle(e.target.value)}
              />
              <p className="text-[10px] text-gray-400 mt-1">Keep it short and descriptive — helps workers understand the issue at a glance.</p>
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5"><FileText size={12} className="text-indigo-500"/> Detailed Description <span className="text-red-400">*</span></span>
                <span className="text-gray-400 font-normal">{description.length}/1000</span>
              </label>
              {textAiResult && !imageAiResult && (
                <p className="text-[10px] text-violet-600 flex items-center gap-1 mb-1 animate-pulse">
                  <Zap size={9} className="text-violet-500"/> AI detected category from your description
                </p>
              )}
              <textarea rows={5}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none transition-all"
                maxLength={1000}
                placeholder={"Describe the problem in detail:\n\u2022 When did it start?\n\u2022 How serious is it?\n\u2022 Any safety risk?\n\u2022 What you have already tried\u2026"}
                value={description}
                onChange={e=>setDescription(e.target.value)}
              />
            </div>

            {/* AI severity alert — real-time keyword detection (Feature #2) */}
            <SeverityAlert text={(complainTitle + ' ' + description)} />

            {/* Priority preview */}
            {finalPriority && pm && (
              <div className={"flex items-center gap-3 p-3.5 rounded-xl border " + pm.border + " " + pm.bg}>
                <span className={"w-3 h-3 rounded-full flex-shrink-0 " + pm.dot}/>
                <div className="flex-1">
                  <p className={"text-xs font-bold " + pm.color}>{finalPriority} Priority &mdash; {finalCategory}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">AI determined from category + description</p>
                </div>
                <span className={"px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-gradient-to-r " + pm.gradient}>{finalPriority}</span>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 4: EVIDENCE ─── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5 text-xs text-green-700">
              <CheckCircle2 size={13} className="flex-shrink-0"/>
              <span>Photos and videos are <strong>optional</strong> — you can skip this step and submit directly.</span>
            </div>

            {/* Photos */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                <Image size={13} className="text-indigo-500"/> Photos
                <span className="font-normal text-gray-400 ml-1">— max 5, any format</span>
              </label>
              <label className="group flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                <div className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">📷</div>
                <p className="text-xs text-gray-400 group-hover:text-indigo-600 font-medium">
                  {files.length>0 ? files.length + ' photo(s) selected — click to change' : 'Click to add photos'}
                </p>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={e => setFiles(Array.from(e.target.files).slice(0,5))}/>
              </label>
              {files.length>0 && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {files.map((f,i)=>(
                    <div key={i} className="relative group">
                      <img src={URL.createObjectURL(f)} alt=""
                        className="w-16 h-16 object-cover rounded-xl border-2 border-gray-200 group-hover:border-indigo-300 transition-colors"/>
                      <button type="button" onClick={()=>setFiles(fs=>fs.filter((_,j)=>j!==i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Videos */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                <Video size={13} className="text-indigo-500"/> Videos
                <span className="font-normal text-gray-400 ml-1">— max 3 clips, 50 MB each</span>
              </label>
              <label className="group flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">🎥</div>
                <p className="text-xs text-gray-400 group-hover:text-indigo-600 font-medium">
                  {videoFiles.length>0 ? videoFiles.length + ' video(s) selected' : 'Click to add videos'}
                </p>
                <input type="file" accept="video/mp4,video/mov,video/avi,video/webm" multiple className="hidden"
                  onChange={e=>setVideoFiles(Array.from(e.target.files).slice(0,3))}/>
              </label>
              {videoFiles.length>0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {videoFiles.map((v,i)=>(
                    <div key={i} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-indigo-700">
                      🎥 <span className="max-w-[120px] truncate">{v.name}</span>
                      <button type="button" onClick={()=>setVideoFiles(vs=>vs.filter((_,j)=>j!==i))}
                        className="text-indigo-400 hover:text-red-500 ml-0.5 font-bold">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 5: PREVIEW & SUBMIT ─── */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-center text-xs text-gray-400">Review everything before submitting</p>

            {/* Feature #1: Duplicate warning */}
            {dupChecked && duplicateMatches.length > 0 && (
              <DuplicateWarning
                matches={duplicateMatches}
                onDismiss={() => setDuplicateMatches([])}
                onMerge={async (originalId) => {
                  try {
                    await complaintService.checkDuplicate({ mergeInto: originalId })
                    toast.success('Your issue has been linked to the existing complaint!')
                    onClose?.()
                  } catch { toast.error('Merge failed. Continuing to file separately.') }
                  setDuplicateMatches([])
                }}
              />
            )}

            {/* Summary card */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
              {/* Header */}
              <div className={"px-4 py-3 flex items-center gap-3 border-b " + (pm ? pm.bg + " " + pm.border : "bg-gray-50 border-gray-200")}>
                <span className="text-3xl">{CATEGORY_ICONS[finalCategory]||'📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-gray-900 text-sm truncate">{finalCategory||'—'}</p>
                  {finalPriority && pm && <p className={"text-[10px] font-bold " + pm.color}>{finalPriority} Priority</p>}
                </div>
                {manualCategory && <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 font-bold">✏️ Override</span>}
              </div>
              <div className="px-4 py-3 space-y-2.5 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Title</p>
                  <p className="text-gray-800 font-semibold">{complainTitle||<span className="italic text-red-400 text-xs">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Location</p>
                  <p className="text-gray-700 flex items-start gap-1 text-xs">
                    <MapPin size={11} className="mt-0.5 flex-shrink-0 text-gray-400"/>{fullLocation||'—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Description</p>
                  <p className="text-gray-700 text-xs leading-relaxed line-clamp-3">{description||<span className="italic text-gray-400">None</span>}</p>
                </div>
                {(files.length>0||videoFiles.length>0) && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Evidence</p>
                    <div className="flex flex-wrap gap-1.5">
                      {files.map((f,i)=><img key={i} src={URL.createObjectURL(f)} alt="" className="w-11 h-11 object-cover rounded-lg border border-gray-200"/>)}
                      {videoFiles.map((_,i)=><div key={i} className="w-11 h-11 bg-indigo-100 rounded-lg border border-indigo-200 flex items-center justify-center text-lg">🎥</div>)}
                    </div>
                  </div>
                )}
                {conf>0 && (
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                    <span className="font-bold">AI:</span>{mm.label} &bull; {conf}% confidence
                  </div>
                )}
              </div>
              {/* Auto-assign footer */}
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-t border-indigo-100 flex items-center gap-2 text-xs text-indigo-700 font-medium">
                <Zap size={12} className="text-indigo-500 flex-shrink-0"/>
                Worker will be <strong>auto-assigned</strong> based on category &amp; workload after submission
              </div>
            </div>

            {/* Feature #16: Genuineness indicator */}
            {genuineness && (
              <GenuinenessIndicator
                score={genuineness.score}
                verdict={genuineness.verdict}
                flags={genuineness.flags}
              />
            )}

            {/* Edit shortcut row */}
            <div className="flex gap-1.5">
              {[{n:1,l:'Category'},{n:2,l:'Location'},{n:3,l:'Details'},{n:4,l:'Evidence'}].map(item=>(
                <button key={item.n} type="button" onClick={()=>setStep(item.n)}
                  className="flex-1 flex items-center justify-center gap-0.5 py-1.5 border border-gray-200 rounded-xl text-[10px] font-semibold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all bg-white">
                  <Pencil size={8}/> {item.l}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>{/* end scroll body */}

      {/* ════ STICKY FOOTER ════ */}
      <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-gray-200 bg-white rounded-b-2xl">
        {step < 5 ? (
          <div className="flex gap-3">
            {step > 1 && (
              <button type="button" onClick={()=>setStep(s=>s-1)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                <ChevronUp size={15} className="-rotate-90"/> Back
              </button>
            )}
            <button type="button"
              disabled={!canGoNext(step)}
              onClick={async () => {
                const next = step + 1
                setStep(next)
                // When entering step 5, run duplicate check + genuineness in background
                if (next === 5) {
                  try {
                    const [dupRes, genRes] = await Promise.allSettled([
                      complaintService.checkDuplicate({ category: finalCategory, location: fullLocation, description, hostelBlock: locFields.hostelBlock || '' }),
                      complaintService.getGenuineness({ title: complainTitle, description, category: finalCategory, location: fullLocation, hostelBlock: locFields.hostelBlock || '', imageCount: files.length, locationType })
                    ])
                    if (dupRes.status === 'fulfilled') { setDuplicateMatches(dupRes.value.matches || []); setDupChecked(true) }
                    if (genRes.status === 'fulfilled') setGenuineness(genRes.value)
                  } catch (_) { /* non-blocking */ }
                }
              }}
              className={"flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 " + (
                canGoNext(step)
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}>
              {step===4 ? 'Review & Finish' : 'Continue'} <ArrowRight size={15}/>
            </button>
          </div>
        ) : (
          <button type="button"
            disabled={isSubmitting || !finalCategory || !fullLocation || complainTitle.trim().length < 5}
            onClick={handleSubmit}
            className={"w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 " + (
              isSubmitting || !finalCategory || !fullLocation || complainTitle.trim().length < 5
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02]'
            )}>
            {isSubmitting
              ? <><Loader2 size={18} className="animate-spin"/> Submitting &amp; Auto-Assigning&hellip;</>
              : <><Zap size={16}/> Submit Complaint &amp; Auto-Assign Worker</>
            }
          </button>
        )}
      </div>

    </div>
  )
}

export default ComplaintForm

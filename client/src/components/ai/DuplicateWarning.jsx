import { useState } from 'react'
import { Copy, GitMerge, AlertTriangle, ExternalLink, CheckCircle2, ArrowRight } from 'lucide-react'

/**
 * DuplicateWarning
 * Props:
 *   matches   – array from findSimilarComplaints: { _id, title, category, location, status, score, hostelBlock }
 *   onDismiss – () => void — user ignores duplicates and proceeds
 *   onMerge   – (originalId) => void — user wants to merge
 */
export default function DuplicateWarning({ matches = [], onDismiss, onMerge }) {
  const [selected, setSelected] = useState(null)
  const [merging, setMerging] = useState(false)

  if (!matches.length) return null

  const handleMerge = async () => {
    if (!selected) return
    setMerging(true)
    try { await onMerge?.(selected) }
    finally { setMerging(false) }
  }

  const statusColor = {
    Submitted: 'text-blue-400 bg-blue-500/10',
    Assigned: 'text-indigo-400 bg-indigo-500/10',
    'In Progress': 'text-yellow-400 bg-yellow-500/10',
    Resolved: 'text-emerald-400 bg-emerald-500/10',
    Rejected: 'text-red-400 bg-red-500/10',
  }

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/70 to-orange-950/50 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/15 mt-0.5">
          <GitMerge className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-300 text-sm">
            {matches.length} Similar Complaint{matches.length > 1 ? 's' : ''} Found
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Your issue might already be reported. Select one to join it, or continue to file separately.
          </p>
        </div>
      </div>

      {/* Match cards */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
        {matches.map((m) => (
          <button
            key={m._id}
            onClick={() => setSelected(selected === m._id ? null : m._id)}
            className={`w-full text-left rounded-xl border p-3 transition-all duration-200 ${
              selected === m._id
                ? 'border-amber-500/70 bg-amber-500/15 shadow-lg shadow-amber-900/30'
                : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{m.title}</p>
                <p className="text-xs text-white/50 mt-0.5">{m.location}{m.hostelBlock ? ` · ${m.hostelBlock}` : ''}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[m.status] || 'text-white/60 bg-white/10'}`}>
                  {m.status}
                </span>
                <span className="text-xs text-white/40">{Math.round((m.score || 0) * 100)}% match</span>
              </div>
            </div>
            {selected === m._id && (
              <div className="flex items-center gap-1.5 mt-2 text-amber-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selected — your issue will be added to this complaint</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleMerge}
          disabled={!selected || merging}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all"
        >
          {merging ? (
            <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
          ) : (
            <GitMerge className="w-4 h-4" />
          )}
          Join This Complaint
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/5 text-white/70 hover:text-white text-sm transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          File Separately
        </button>
      </div>
    </div>
  )
}

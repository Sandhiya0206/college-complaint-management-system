import StatusBadge from '../common/StatusBadge'
import PriorityBadge from '../common/PriorityBadge'
import ConfidenceBadge from '../common/ConfidenceBadge'
import { getCategoryIcon, formatDate } from '../../utils/helpers'
import { MapPin, ChevronRight, Brain, AlertTriangle } from 'lucide-react'

const ComplaintCard = ({ complaint, onClick }) => {
  const { complaintId, category, priority, status, location, aiAnalysis, assignedTo, createdAt, images, isEscalated } = complaint

  return (
    <div
      onClick={onClick}
      className="card cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Image thumbnail */}
        {images?.[0] ? (
          <img src={images[0]} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-gray-200" />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
            {getCategoryIcon(category)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-mono text-xs text-indigo-600 font-medium">{complaintId}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-semibold text-gray-900">{getCategoryIcon(category)} {category}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <MapPin size={11} />
            <span className="truncate">{location}</span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <StatusBadge status={status} />
            <PriorityBadge priority={priority} />
            {isEscalated && (
              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-semibold">
                <AlertTriangle size={8} /> ESCALATED
              </span>
            )}
            {aiAnalysis?.confidence && <ConfidenceBadge confidence={aiAnalysis.confidence} />}
            {aiAnalysis?.studentOverrode && (
              <span className="badge bg-orange-100 text-orange-700 border-orange-200 text-[10px]">Overridden</span>
            )}
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{formatDate(createdAt, 'MMM d, yyyy')}</span>
            {assignedTo && (
              <span className="text-xs text-gray-500">
                👤 {assignedTo.name?.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComplaintCard

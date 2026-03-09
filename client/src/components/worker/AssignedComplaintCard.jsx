import { formatRelativeTime, getCategoryIcon } from '../../utils/helpers'
import StatusBadge from '../common/StatusBadge'
import PriorityBadge from '../common/PriorityBadge'
import ConfidenceBadge from '../common/ConfidenceBadge'
import SLATimer from '../common/SLATimer'
import { MapPin, User, Zap, Home, Hash, AlertTriangle } from 'lucide-react'

const AssignedComplaintCard = ({ complaint, onStartWork, onUpdateStatus, onView }) => {
  const { complaintId, category, priority, status, location, hostelBlock, roomNumber, student, aiAnalysis, assignedAt, images, slaDeadline, isEscalated } = complaint

  return (
    <div className={`card hover:border-indigo-200 transition-all ${isEscalated ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="flex gap-4">
        {/* Category Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
          priority === 'High' ? 'bg-red-50' : priority === 'Medium' ? 'bg-yellow-50' : 'bg-green-50'
        }`}>
          {images?.[0] ? (
            <img src={images[0]} className="w-full h-full object-cover rounded-xl" alt="" />
          ) : getCategoryIcon(category)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-indigo-600 font-medium">{complaintId}</span>
                {isEscalated && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-semibold">
                    <AlertTriangle size={8} /> ESCALATED
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-900 mt-0.5">{getCategoryIcon(category)} {category}</div>
            </div>
            <PriorityBadge priority={priority} />
          </div>

          {/* Location info */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
            {location && <span className="flex items-center gap-0.5"><MapPin size={11} />{location}</span>}
            {hostelBlock && <span className="flex items-center gap-0.5"><Home size={11} />{hostelBlock}</span>}
            {roomNumber  && <span className="flex items-center gap-0.5"><Hash size={11} />{roomNumber}</span>}
            {student && <span className="flex items-center gap-0.5"><User size={11} />{student.name}</span>}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <StatusBadge status={status} />
            {aiAnalysis?.confidence && <ConfidenceBadge confidence={aiAnalysis.confidence} />}
            <span className="text-xs text-gray-400">Assigned {formatRelativeTime(assignedAt)}</span>
          </div>

          {/* SLA Timer */}
          {slaDeadline && status !== 'Resolved' && (
            <div className="mt-2">
              <SLATimer deadline={slaDeadline} compact />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button onClick={() => onView(complaint._id)} className="btn-ghost text-xs py-1 px-3">
              View Details
            </button>
            {status === 'Assigned' && (
              <button onClick={() => onStartWork(complaint._id)} className="btn-primary text-xs py-1 px-3 flex items-center gap-1">
                <Zap size={12} /> Start Work
              </button>
            )}
            {(status === 'In Progress' || status === 'On Hold') && (
              <button
                onClick={() => onUpdateStatus(complaint)}
                className="btn-primary text-xs py-1 px-3 bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1"
              >
                Update Status
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssignedComplaintCard

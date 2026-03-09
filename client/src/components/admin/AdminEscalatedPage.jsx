import { useState, useEffect } from 'react'
import { adminService } from '../../services/admin.service'
import { formatDate, getCategoryIcon } from '../../utils/helpers'
import StatusBadge from '../common/StatusBadge'
import PriorityBadge from '../common/PriorityBadge'
import SLATimer from '../common/SLATimer'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'
import ComplaintDetailModal from './ComplaintDetailModal'
import { AlertTriangle, RefreshCw, MapPin, User, Calendar } from 'lucide-react'

const AdminEscalatedPage = () => {
  const [complaints, setComplaints] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const data = await adminService.getEscalatedComplaints()
      setComplaints(data.complaints || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-100 rounded-xl">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Escalated Complaints</h2>
            <p className="text-xs text-gray-500">{complaints.length} complaint{complaints.length !== 1 ? 's' : ''} requiring attention</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading escalated complaints..." />
      ) : complaints.length === 0 ? (
        <EmptyState icon="✅" title="No escalated complaints" description="All complaints are within SLA limits." />
      ) : (
        <div className="space-y-3">
          {complaints.map(c => (
            <div
              key={c._id}
              className="card border-red-200 bg-red-50/30 cursor-pointer hover:border-red-300 transition-colors"
              onClick={() => setSelectedId(c._id)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {getCategoryIcon(c.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs text-red-600 font-medium">{c.complaintId}</span>
                      <div className="text-sm font-semibold text-gray-900 mt-0.5">{c.category}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <StatusBadge status={c.status} />
                      <PriorityBadge priority={c.priority} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                    {c.location && <span className="flex items-center gap-0.5"><MapPin size={11} />{c.location}</span>}
                    {c.assignedTo && <span className="flex items-center gap-0.5"><User size={11} />{c.assignedTo.name}</span>}
                    <span className="flex items-center gap-0.5"><Calendar size={11} />Escalated {formatDate(c.escalatedAt)}</span>
                  </div>

                  {c.escalationReason && (
                    <p className="text-xs text-red-700 mt-1.5 italic">"{c.escalationReason}"</p>
                  )}

                  {c.slaDeadline && (
                    <div className="mt-2">
                      <SLATimer deadline={c.slaDeadline} compact />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedId && (
        <ComplaintDetailModal
          complaintId={selectedId}
          onClose={() => { setSelectedId(null); load() }}
        />
      )}
    </div>
  )
}

export default AdminEscalatedPage

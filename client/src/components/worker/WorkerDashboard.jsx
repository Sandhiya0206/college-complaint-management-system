import { useState, useEffect } from 'react'
import { workerService } from '../../services/worker.service'
import AssignedComplaintCard from './AssignedComplaintCard'
import WorkerStats from './WorkerStats'
import ComplaintDetailModal from './ComplaintDetailModal'
import UpdateStatusModal from './UpdateStatusModal'
import EmptyState from '../common/EmptyState'
import LoadingSpinner from '../common/LoadingSpinner'
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates'
import { useAuth } from '../../context/AuthContext'
import { ClipboardList, Zap, CheckCircle2, BarChart3 } from 'lucide-react'

const WorkerDashboard = () => {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [detailId, setDetailId] = useState(null)
  const [resolveTarget, setResolveTarget] = useState(null)

  useRealTimeUpdates()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
        const [activeData, onHoldData, resolvedData, sData] = await Promise.all([
        workerService.getAssignedComplaints(),
        workerService.getAssignedComplaints({ status: 'On Hold' }),
        workerService.getAssignedComplaints({ status: 'Resolved' }),
        workerService.getStats(),
      ])
      setComplaints([
        ...(activeData.complaints || []),
        ...(onHoldData.complaints || []),
        ...(resolvedData.complaints || []),
      ])
      setStats(sData.stats)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartWork = async (id) => {
    try {
      await workerService.startWork(id)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleResolved = () => {
    setResolveTarget(null)
    loadData()
  }

  const active = complaints.filter(c => ['Assigned', 'In Progress', 'On Hold'].includes(c.status))
  const resolved = complaints.filter(c => c.status === 'Resolved')

  const statCards = [
    { label: 'Total Assigned', value: stats?.assigned ?? 0, icon: <ClipboardList size={18} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'In Progress', value: stats?.inProgress ?? 0, icon: <Zap size={18} />, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Resolved Today', value: stats?.completedToday ?? 0, icon: <CheckCircle2 size={18} />, color: 'bg-green-50 text-green-600' },
    { label: 'Total Resolved', value: stats?.completedTotal ?? 0, icon: <BarChart3 size={18} />, color: 'bg-emerald-50 text-emerald-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Worker Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.department} Department — {user?.name}</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map(s => (
            <div key={s.label} className="card p-4">
              <div className={`inline-flex p-2 rounded-lg ${s.color} mb-2`}>{s.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Stats charts */}
        {stats && <WorkerStats stats={stats} />}

        {/* Complaints tabs */}
        <div className="card">
          <div className="flex gap-1 mb-4">
            {[
              { id: 'active', label: `Active (${active.length})` },
              { id: 'resolved', label: `Resolved (${resolved.length})` },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <LoadingSpinner text="Loading complaints..." />
          ) : (
            <>
              {activeTab === 'active' && (
                active.length === 0 ? (
                  <EmptyState icon="🎉" title="All clear!" description="No active complaints assigned to you." />
                ) : (
                  <div className="space-y-3">
                    {active
                      .sort((a, b) => {
                        const po = { High: 0, Medium: 1, Low: 2 }
                        if (po[a.priority] !== po[b.priority]) return po[a.priority] - po[b.priority]
                        return new Date(a.assignedAt) - new Date(b.assignedAt)
                      })
                      .map(c => (
                        <AssignedComplaintCard
                          key={c._id}
                          complaint={c}
                          onStartWork={handleStartWork}
                          onUpdateStatus={setResolveTarget}
                          onView={setDetailId}
                        />
                      ))}
                  </div>
                )
              )}
              {activeTab === 'resolved' && (
                resolved.length === 0 ? (
                  <EmptyState icon="📋" title="No resolved complaints" description="Completed complaints will appear here." />
                ) : (
                  <div className="space-y-3">
                    {resolved.map(c => (
                      <AssignedComplaintCard
                        key={c._id}
                        complaint={c}
                        onStartWork={null}
                        onUpdateStatus={null}
                        onView={setDetailId}
                      />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {detailId && (
        <ComplaintDetailModal
          complaintId={detailId}
          onClose={() => setDetailId(null)}
          onStartWork={handleStartWork}
          onUpdateStatus={setResolveTarget}
        />
      )}
      {resolveTarget && (
        <UpdateStatusModal
          complaint={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onSuccess={handleResolved}
        />
      )}
    </div>
  )
}

export default WorkerDashboard

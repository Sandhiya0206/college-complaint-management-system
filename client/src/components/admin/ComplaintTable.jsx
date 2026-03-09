import { useState } from 'react'
import StatusBadge from '../common/StatusBadge'
import PriorityBadge from '../common/PriorityBadge'
import ConfidenceBadge from '../common/ConfidenceBadge'
import { getCategoryIcon, formatRelativeTime } from '../../utils/helpers'
import { MapPin, User, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

const ComplaintTable = ({ complaints, onRowClick, newIds = [] }) => {
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sorted = [...complaints].sort((a, b) => {
    let va = a[sortField], vb = b[sortField]
    if (sortField === 'priority') {
      const o = { High: 0, Medium: 1, Low: 2 }
      va = o[va]; vb = o[vb]
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} className="text-gray-300" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-indigo-600" /> : <ChevronDown size={12} className="text-indigo-600" />
  }

  const th = (label, field) => (
    <th
      className="px-3 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">{label} <SortIcon field={field} /></div>
    </th>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {th('Complaint ID', 'complaintId')}
            {th('Category', 'category')}
            {th('Location', 'location')}
            {th('Priority', 'priority')}
            {th('Status', 'status')}
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">AI Conf.</th>
            {th('Assigned To', 'assignedTo')}
            {th('Date', 'createdAt')}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map(c => (
            <tr
              key={c._id}
              onClick={() => onRowClick(c._id)}
              className={`cursor-pointer hover:bg-indigo-50 transition-colors ${
                newIds.includes(c._id) ? 'animate-new-row' : ''
              }`}
            >
              <td className="px-3 py-3">
                <span className="font-mono text-xs text-indigo-600 font-medium">{c.complaintId}</span>
              </td>
              <td className="px-3 py-3">
                <span className="text-sm">{getCategoryIcon(c.category)} {c.category}</span>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-1 text-gray-600 text-xs">
                  <MapPin size={11} /><span className="truncate max-w-[100px]">{c.location}</span>
                </div>
              </td>
              <td className="px-3 py-3"><PriorityBadge priority={c.priority} /></td>
              <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-3 py-3">
                {c.aiAnalysis?.confidence ? <ConfidenceBadge confidence={c.aiAnalysis.confidence} /> : <span className="text-gray-400 text-xs">—</span>}
              </td>
              <td className="px-3 py-3">
                {c.assignedTo ? (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <User size={11} /><span>{c.assignedTo.name?.split(' ')[0]}</span>
                  </div>
                ) : <span className="text-gray-400 text-xs">Unassigned</span>}
              </td>
              <td className="px-3 py-3 text-xs text-gray-400">{formatRelativeTime(c.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">No complaints found</div>
      )}
    </div>
  )
}

export default ComplaintTable

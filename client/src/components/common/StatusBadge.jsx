import { getStatusColor } from '../../utils/helpers'

const StatusBadge = ({ status, size = 'sm' }) => {
  const colors = getStatusColor(status)
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span className={`badge ${colors.bg} ${colors.text} ${colors.border} ${sizeClass} font-medium`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 inline-block" />
      {status}
    </span>
  )
}

export default StatusBadge

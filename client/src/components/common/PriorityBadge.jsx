import { getPriorityColor } from '../../utils/helpers'
import { ArrowUp, Minus, ArrowDown } from 'lucide-react'

const PriorityBadge = ({ priority, size = 'sm' }) => {
  const colors = getPriorityColor(priority)
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  const icons = {
    High: <ArrowUp size={12} />,
    Medium: <Minus size={12} />,
    Low: <ArrowDown size={12} />
  }

  return (
    <span className={`badge ${colors.bg} ${colors.text} ${colors.border} ${sizeClass} font-semibold`}>
      {icons[priority]}
      {priority}
    </span>
  )
}

export default PriorityBadge

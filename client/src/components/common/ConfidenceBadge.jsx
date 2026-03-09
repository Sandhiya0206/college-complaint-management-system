import { getConfidenceColor } from '../../utils/helpers'
import { Brain } from 'lucide-react'

const ConfidenceBadge = ({ confidence, size = 'sm' }) => {
  const pct = Math.round((confidence || 0) * 100)
  const colors = getConfidenceColor(confidence || 0)
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span className={`badge ${colors.bg} ${colors.text} ${colors.border} ${sizeClass}`} title={`AI Confidence: ${pct}%`}>
      <Brain size={11} />
      {pct}%
    </span>
  )
}

export default ConfidenceBadge

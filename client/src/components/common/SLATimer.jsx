import { useEffect, useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'

/**
 * SLATimer — shows a countdown to the SLA deadline
 * Props:
 *  - deadline: ISO string or Date  (slaDeadline from complaint)
 *  - compact: boolean (show compact pill only)
 */
const SLATimer = ({ deadline, compact = false }) => {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    if (!deadline) return

    const calc = () => {
      const now = Date.now()
      const end = new Date(deadline).getTime()
      setRemaining(end - now)
    }

    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (!deadline) return null

  const isOverdue = remaining !== null && remaining <= 0
  const hoursLeft = remaining !== null ? remaining / 3_600_000 : null

  const getColor = () => {
    if (isOverdue) return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: 'text-red-500' }
    if (hoursLeft < 6) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: 'text-red-400' }
    if (hoursLeft < 24) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: 'text-amber-400' }
    return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', icon: 'text-green-400' }
  }

  const formatRemaining = () => {
    if (isOverdue) {
      const overdue = Math.abs(remaining)
      const h = Math.floor(overdue / 3_600_000)
      const m = Math.floor((overdue % 3_600_000) / 60_000)
      return `Overdue by ${h}h ${m}m`
    }
    const h = Math.floor(remaining / 3_600_000)
    const m = Math.floor((remaining % 3_600_000) / 60_000)
    const s = Math.floor((remaining % 60_000) / 1_000)
    if (h > 0) return `${h}h ${m}m left`
    if (m > 0) return `${m}m ${s}s left`
    return `${s}s left`
  }

  const c = getColor()

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.bg} ${c.text} ${c.border}`}>
        {isOverdue ? <AlertTriangle size={9} /> : <Clock size={9} />}
        {formatRemaining()}
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${c.bg} ${c.border}`}>
      <div className={c.icon}>
        {isOverdue ? <AlertTriangle size={14} /> : <Clock size={14} />}
      </div>
      <div>
        <div className={`text-xs font-semibold ${c.text}`}>{formatRemaining()}</div>
        <div className="text-[10px] text-gray-400">
          Deadline: {new Date(deadline).toLocaleString()}
        </div>
      </div>
    </div>
  )
}

export default SLATimer

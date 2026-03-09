import { useEffect, useRef } from 'react'
import { getConfidenceColor } from '../../utils/helpers'

const ConfidenceBar = ({ confidence = 0, showLabel = true, className = '' }) => {
  const barRef = useRef(null)
  const pct = Math.round(confidence * 100)
  const colors = getConfidenceColor(confidence)

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = '0%'
      setTimeout(() => {
        if (barRef.current) {
          barRef.current.style.width = `${pct}%`
        }
      }, 50)
    }
  }, [pct])

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-gray-500">AI Confidence</span>
          <span className={`text-xs font-semibold ${colors.text}`}>{pct}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          ref={barRef}
          className={`${colors.bar} h-2 rounded-full transition-all duration-700 ease-out`}
          style={{ width: '0%' }}
        />
      </div>
    </div>
  )
}

export default ConfidenceBar

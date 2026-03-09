const ActivityTimeline = ({ history = [] }) => {
  const statusIcons = {
    Submitted: { icon: '📋', color: 'bg-blue-500' },
    Assigned: { icon: '👤', color: 'bg-yellow-500' },
    'In Progress': { icon: '🔧', color: 'bg-orange-500' },
    Resolved: { icon: '✅', color: 'bg-green-500' },
    Rejected: { icon: '❌', color: 'bg-red-500' }
  }

  if (!history || history.length === 0) {
    return <div className="text-sm text-gray-400 py-4">No history available</div>
  }

  return (
    <div className="space-y-1">
      {history.map((item, index) => {
        const config = statusIcons[item.status] || { icon: '📌', color: 'bg-gray-400' }
        const isLast = index === history.length - 1

        return (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 ${config.color} rounded-full flex items-center justify-center text-sm flex-shrink-0`}>
                {config.icon}
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1 min-h-4" />}
            </div>
            <div className={`flex-1 ${!isLast ? 'pb-4' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{item.status}</span>
                <span className="text-xs text-gray-400">
                  {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                </span>
              </div>
              {item.remarks && (
                <p className="text-xs text-gray-500 mt-0.5">{item.remarks}</p>
              )}
              {item.isAutoUpdate && (
                <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded mt-1 inline-block">🤖 Auto</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ActivityTimeline

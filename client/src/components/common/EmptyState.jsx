const EmptyState = ({ icon = '📭', title = 'No data found', description = '', action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
    {description && <p className="text-sm text-gray-500 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

export default EmptyState

export default function EmptyState({ icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      {hint && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
    </div>
  )
}

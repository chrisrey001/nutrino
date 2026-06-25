export default function MacroBar({ label, eaten, goal, unit = 'g', gradient = 'bg-gradient-to-r from-green-400 to-emerald-500', className = '', icon }) {
  const ratio = goal > 0 ? eaten / goal : 0
  const pct = Math.min(100, Math.round(ratio * 100))
  const barClass = ratio > 1.25
    ? 'bg-gradient-to-r from-red-400 to-red-600'
    : ratio > 1.1
    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
    : gradient

  return (
    <div className={className}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="text-xs text-gray-500">
          {Math.round(eaten)}{unit} <span className="text-gray-400">/ {goal}{unit} · {pct}%</span>
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

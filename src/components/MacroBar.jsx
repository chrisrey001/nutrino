import { macroBarColor } from '../lib/utils'

export default function MacroBar({ label, eaten, goal, unit = 'g', className = '' }) {
  const pct = goal > 0 ? Math.min(100, Math.round((eaten / goal) * 100)) : 0
  const color = macroBarColor(eaten, goal)

  return (
    <div className={`${className}`}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs text-gray-500">
          {Math.round(eaten)}{unit} <span className="text-gray-400">/ {goal}{unit}</span>
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

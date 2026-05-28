import { IconFlame, IconTarget, IconChartDonut, IconBread, IconMeat, IconDroplet } from '@tabler/icons-react'
import MacroBar from './MacroBar'

function RingProgress({ pct, color, size, strokeWidth, children }) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const safe = Math.min(1, Math.max(0, pct))
  const offset = circ * (1 - safe)
  const cx = size / 2, cy = size / 2
  const angle = (safe * 360 - 90) * (Math.PI / 180)
  const dx = cx + r * Math.cos(angle)
  const dy = cy + r * Math.sin(angle)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        {safe > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color}
            strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        )}
        {safe > 0.03 && (
          <circle cx={dx} cy={dy} r={strokeWidth / 2 - 0.5} fill="white" stroke="#d1d5db" strokeWidth={0.5} />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

function CaloriesStackedBar({ eaten, goal }) {
  const W = 300, H = 18
  const pct = goal > 0 ? Math.min(1, eaten / goal) : 0
  const over = eaten > goal
  const eatenW = Math.max(4, pct * W)
  const color = over ? '#ef4444' : '#14b8a6'
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <rect x={0} y={0} width={W} height={H} rx={9} fill="#f3f4f6" />
      <rect x={0} y={0} width={eatenW} height={H} rx={9} fill={color} />
      {!over && pct < 0.97 && <rect x={eatenW - 2} y={0} width={4} height={H} fill="white" />}
    </svg>
  )
}

export function CaloriesCard({ eaten, goal }) {
  const pct = goal > 0 ? eaten / goal : 0
  const remaining = Math.max(0, goal - eaten)

  return (
    <div className="bg-gray-50 rounded-3xl p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <IconFlame size={16} stroke={1.5} className="text-teal-500" />
        <p className="text-sm font-bold text-gray-900">Calories</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-center gap-1">
          <IconFlame size={28} stroke={1.5} className="text-teal-400" />
          <p className="text-2xl font-bold text-gray-900 leading-none">{eaten.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Eaten</p>
        </div>

        <RingProgress pct={pct} color="#14b8a6" size={130} strokeWidth={12}>
          <p className="text-2xl font-bold text-gray-900 leading-none">{remaining.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">Remaining</p>
        </RingProgress>

        <div className="flex-1 flex flex-col items-center gap-1">
          <IconTarget size={28} stroke={1.5} className="text-blue-400" />
          <p className="text-2xl font-bold text-gray-900 leading-none">{goal.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Intake Goal</p>
        </div>
      </div>

      <div className="mt-4">
        <CaloriesStackedBar eaten={eaten} goal={goal} />
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-teal-500 font-medium">Eaten</span>
          <span className="text-xs text-gray-400 font-medium">Goal</span>
        </div>
      </div>
    </div>
  )
}

export function MacrosCard({ carbs, carbsGoal, protein, proteinGoal, fats, fatsGoal }) {
  return (
    <div className="bg-gray-50 rounded-3xl p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <IconChartDonut size={16} stroke={1.5} className="text-gray-500" />
        <p className="text-sm font-bold text-gray-900">Macros</p>
      </div>
      <div className="space-y-3">
        <MacroBar
          label="Carbs" eaten={carbs} goal={carbsGoal} color="bg-blue-500"
          icon={<IconBread size={13} stroke={1.5} color="#3b82f6" />}
        />
        <MacroBar
          label="Protein" eaten={protein} goal={proteinGoal} color="bg-purple-500"
          icon={<IconMeat size={13} stroke={1.5} color="#8b5cf6" />}
        />
        <MacroBar
          label="Fats" eaten={fats} goal={fatsGoal} color="bg-orange-500"
          icon={<IconDroplet size={13} stroke={1.5} color="#f97316" />}
        />
      </div>
    </div>
  )
}

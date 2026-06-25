import { IconFlame, IconTarget, IconChartDonut, IconBread, IconMeat, IconDroplet } from '@tabler/icons-react'
import MacroBar from './MacroBar'

function RingProgress({ pct, from = '#34d399', to = '#059669', gradientId = 'ringGrad', size, strokeWidth, children }) {
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
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        {safe > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${gradientId})`}
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
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="calBarGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} rx={9} fill="#f3f4f6" />
      <rect x={0} y={0} width={eatenW} height={H} rx={9} fill={over ? '#ef4444' : 'url(#calBarGrad)'} />
      {!over && pct < 0.97 && <rect x={eatenW - 2} y={0} width={4} height={H} fill="white" />}
    </svg>
  )
}

export function CaloriesCard({ eaten, goal }) {
  const pct = goal > 0 ? eaten / goal : 0
  const remaining = Math.max(0, goal - eaten)

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center flex-shrink-0">
          <IconFlame size={14} stroke={2} className="text-white" />
        </span>
        <p className="text-sm font-bold text-gray-900">Calories</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
            <IconFlame size={20} stroke={1.8} className="text-emerald-500" />
          </span>
          <p className="text-2xl font-bold text-gray-900 leading-none">{eaten.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Eaten</p>
        </div>

        <RingProgress pct={pct} from="#34d399" to="#059669" size={130} strokeWidth={12}>
          <p className="text-2xl font-extrabold leading-none bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">{remaining.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">Remaining</p>
        </RingProgress>

        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
            <IconTarget size={20} stroke={1.8} className="text-blue-500" />
          </span>
          <p className="text-2xl font-bold text-gray-900 leading-none">{goal.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Intake Goal</p>
        </div>
      </div>

      <div className="mt-4">
        <CaloriesStackedBar eaten={eaten} goal={goal} />
        <div className="flex justify-between mt-1.5">
          <span className="text-xs font-semibold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">Eaten</span>
          <span className="text-xs text-gray-400 font-medium">Goal</span>
        </div>
      </div>
    </div>
  )
}

export function MacrosCard({ carbs, carbsGoal, protein, proteinGoal, fats, fatsGoal }) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center flex-shrink-0">
          <IconChartDonut size={14} stroke={2} className="text-white" />
        </span>
        <p className="text-sm font-bold text-gray-900">Macros</p>
      </div>
      <div className="space-y-3.5">
        <MacroBar
          label="Carbs" eaten={carbs} goal={carbsGoal}
          gradient="bg-gradient-to-r from-blue-400 to-indigo-500"
          icon={<IconBread size={13} stroke={1.5} color="#3b82f6" />}
        />
        <MacroBar
          label="Protein" eaten={protein} goal={proteinGoal}
          gradient="bg-gradient-to-r from-purple-400 to-fuchsia-500"
          icon={<IconMeat size={13} stroke={1.5} color="#8b5cf6" />}
        />
        <MacroBar
          label="Fats" eaten={fats} goal={fatsGoal}
          gradient="bg-gradient-to-r from-orange-400 to-amber-500"
          icon={<IconDroplet size={13} stroke={1.5} color="#f97316" />}
        />
      </div>
    </div>
  )
}

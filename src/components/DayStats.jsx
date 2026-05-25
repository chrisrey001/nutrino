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

export function CaloriesCard({ eaten, goal }) {
  const pct = goal > 0 ? eaten / goal : 0
  const remaining = Math.max(0, goal - eaten)

  return (
    <div className="bg-gray-50 rounded-3xl p-5">
      <p className="text-sm font-bold text-gray-900 mb-4">Calories</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-center gap-1">
          <svg className="w-7 h-7 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2M5.636 5.636l1.414 1.414M15.95 15.95l1.414 1.414M3 12h2m14 0h2M5.636 18.364l1.414-1.414M15.95 8.05l1.414-1.414" />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={1.5} fill="none" />
          </svg>
          <p className="text-2xl font-bold text-gray-900 leading-none">{eaten.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Eaten</p>
        </div>

        <RingProgress pct={pct} color="#14b8a6" size={130} strokeWidth={12}>
          <p className="text-2xl font-bold text-gray-900 leading-none">{remaining.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">Remaining</p>
        </RingProgress>

        <div className="flex-1 flex flex-col items-center gap-1">
          <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} fill="none" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          </svg>
          <p className="text-2xl font-bold text-gray-900 leading-none">{goal.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Intake Goal</p>
        </div>
      </div>
    </div>
  )
}

export function MacrosCard({ carbs, carbsGoal, protein, proteinGoal, fats, fatsGoal }) {
  const macros = [
    { label: 'Carbs', eaten: carbs, goal: carbsGoal, color: '#3b82f6',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8 2 5 6 5 10c0 5.25 7 12 7 12s7-6.75 7-12c0-4-3-8-7-8z" /> },
    { label: 'Protein', eaten: protein, goal: proteinGoal, color: '#8b5cf6',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /> },
    { label: 'Fats', eaten: fats, goal: fatsGoal, color: '#f97316',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C9 6 6 9 6 13a6 6 0 0012 0c0-4-3-7-6-11z" /> },
  ]

  return (
    <div className="bg-gray-50 rounded-3xl p-5">
      <p className="text-sm font-bold text-gray-900 mb-4">Macros</p>
      <div className="grid grid-cols-3 gap-3">
        {macros.map(({ label, eaten, goal, color, icon }) => {
          const pct = goal > 0 ? eaten / goal : 0
          return (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
                  {icon}
                </svg>
                {label}
              </div>
              <RingProgress pct={pct} color={color} size={88} strokeWidth={9}>
                <p className="text-sm font-bold text-gray-900">{Math.round(pct * 100)}%</p>
              </RingProgress>
              <p className="text-xs text-center">
                <span className="font-semibold text-gray-800">{Math.round(eaten)}g</span>
                <span className="text-gray-400">/{goal}g</span>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

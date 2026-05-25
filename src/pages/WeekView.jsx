import { useState, useMemo, useEffect } from 'react'
import { useMealsRange } from '../hooks/useMealsRange'
import { useProfile } from '../hooks/useProfile'
import { getWeekDates, sumMacros, toLocalDateString, generateWeeklyNote } from '../lib/utils'
import { generateWeeklyPDF } from '../lib/pdf'
import { generateWeekInsight } from '../lib/gemini'

const todayStr = toLocalDateString()

// --- SVG Chart Components ---

function DonutChart({ carbs, protein, fats }) {
  const carbsCal = carbs * 4
  const protCal = protein * 4
  const fatsCal = fats * 9
  const total = carbsCal + protCal + fatsCal
  const r = 42, cx = 60, cy = 60, sw = 14
  const circ = 2 * Math.PI * r
  const gap = 2

  if (total === 0) {
    return (
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fill="#9ca3af">No data</text>
      </svg>
    )
  }

  const segments = [
    { pct: carbsCal / total, color: '#3b82f6' },
    { pct: protCal / total, color: '#8b5cf6' },
    { pct: fatsCal / total, color: '#f97316' },
  ]

  let cumPct = 0
  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
      {segments.map((seg, i) => {
        const dashLen = Math.max(0, seg.pct * circ - gap)
        const rotation = cumPct * 360 - 90
        cumPct += seg.pct
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={`${dashLen} ${circ}`}
            transform={`rotate(${rotation} ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        )
      })}
    </svg>
  )
}

function BudgetLineChart({ weekDates, mealsByDate, goal }) {
  const W = 300, H = 120
  const pL = 36, pR = 10, pT = 12, pB = 28
  const plotW = W - pL - pR, plotH = H - pT - pB

  const dailyCals = weekDates.map(d => sumMacros(mealsByDate[d] || []).calories)
  const maxCal = Math.max(...dailyCals, goal, 1) * 1.18
  const toX = i => pL + (i / 6) * plotW
  const toY = v => pT + plotH - (v / maxCal) * plotH
  const goalY = toY(goal)

  const points = dailyCals.map((c, i) => `${toX(i).toFixed(1)},${toY(c).toFixed(1)}`).join(' ')
  const labels = weekDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1))

  const yTicks = [0, Math.round(goal / 2), goal]

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {yTicks.map(v => (
        <g key={v}>
          <line x1={pL} y1={toY(v)} x2={W - pR} y2={toY(v)} stroke="#f3f4f6" strokeWidth={1} />
          <text x={pL - 3} y={toY(v) + 3} textAnchor="end" fontSize={8} fill="#d1d5db">{v}</text>
        </g>
      ))}
      <line x1={pL} y1={goalY} x2={W - pR} y2={goalY} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7} />
      <polyline points={points} fill="none" stroke="#f97316" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {dailyCals.map((c, i) => (
        <circle key={i} cx={toX(i)} cy={toY(c)} r={3.5}
          fill={c > 0 ? '#f97316' : 'white'} stroke={c > 0 ? '#f97316' : '#e5e7eb'} strokeWidth={1.5} />
      ))}
      {weekDates.map((d, i) => (
        <text key={d} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#9ca3af">{labels[i]}</text>
      ))}
    </svg>
  )
}

function CaloriesBarChart({ weekDates, mealsByDate, goal }) {
  const W = 300, H = 110
  const pL = 8, pR = 8, pT = 10, pB = 24
  const plotW = W - pL - pR, plotH = H - pT - pB
  const dailyCals = weekDates.map(d => sumMacros(mealsByDate[d] || []).calories)
  const maxCal = Math.max(...dailyCals, goal, 1) * 1.15
  const slotW = plotW / 7
  const barW = slotW * 0.6
  const toX = i => pL + i * slotW + (slotW - barW) / 2
  const barH = v => Math.max(2, (v / maxCal) * plotH)
  const goalY = pT + plotH - (goal / maxCal) * plotH
  const labels = weekDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pL} y1={goalY} x2={W - pR} y2={goalY} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,2" />
      {dailyCals.map((c, i) => {
        const h = barH(c)
        const x = toX(i)
        const y = pT + plotH - h
        const pct = goal > 0 ? c / goal : 0
        const fill = c === 0 ? '#f3f4f6' : pct > 1.25 ? '#ef4444' : pct > 1.1 ? '#f59e0b' : '#22c55e'
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={3} fill={fill} />
            <text x={x + barW / 2} y={H - 5} textAnchor="middle" fontSize={9} fill="#9ca3af">{labels[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

function MacroDailyChart({ weekDates, mealsByDate, macroKey, goalG, color }) {
  const W = 300, H = 100
  const pL = 8, pR = 8, pT = 10, pB = 24
  const plotW = W - pL - pR, plotH = H - pT - pB
  const dailyVals = weekDates.map(d => sumMacros(mealsByDate[d] || [])[macroKey] || 0)
  const maxVal = Math.max(...dailyVals, goalG, 1) * 1.18
  const slotW = plotW / 7
  const barW = slotW * 0.6
  const toX = i => pL + i * slotW + (slotW - barW) / 2
  const barH = v => Math.max(2, (v / maxVal) * plotH)
  const goalY = pT + plotH - (goalG / maxVal) * plotH
  const labels = weekDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pL} y1={goalY} x2={W - pR} y2={goalY} stroke={color} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.5} />
      {dailyVals.map((v, i) => {
        const h = barH(v)
        const x = toX(i)
        const y = pT + plotH - h
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={3} fill={v > 0 ? color : '#f3f4f6'} opacity={v > 0 ? 0.85 : 1} />
            <text x={x + barW / 2} y={H - 5} textAnchor="middle" fontSize={9} fill="#9ca3af">{labels[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

// --- Main Component ---

export default function WeekView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [aiInsight, setAiInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const { profile } = useProfile()

  const refDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])

  const weekDates = useMemo(() => getWeekDates(refDate), [refDate])
  const { mealsByDate, loading } = useMealsRange(weekDates)

  const prevWeekDates = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + (weekOffset - 1) * 7)
    return getWeekDates(d)
  }, [weekOffset])
  const { mealsByDate: prevMealsByDate } = useMealsRange(prevWeekDates)

  const allMeals = useMemo(() => weekDates.flatMap(d => mealsByDate[d] || []), [mealsByDate, weekDates])
  const weekTotals = useMemo(() => sumMacros(allMeals), [allMeals])
  const daysWithMeals = useMemo(() => weekDates.filter(d => (mealsByDate[d] || []).length > 0).length, [mealsByDate, weekDates])

  const prevAllMeals = useMemo(() => prevWeekDates.flatMap(d => prevMealsByDate[d] || []), [prevMealsByDate, prevWeekDates])
  const prevTotals = useMemo(() => sumMacros(prevAllMeals), [prevAllMeals])
  const prevDays = useMemo(() => prevWeekDates.filter(d => (prevMealsByDate[d] || []).length > 0).length, [prevMealsByDate, prevWeekDates])

  const avgCal = daysWithMeals > 0 ? Math.round(weekTotals.calories / daysWithMeals) : 0
  const avgCarbs = daysWithMeals > 0 ? Math.round(weekTotals.carbs_g / daysWithMeals) : 0
  const avgProtein = daysWithMeals > 0 ? Math.round(weekTotals.protein_g / daysWithMeals) : 0
  const avgFats = daysWithMeals > 0 ? Math.round(weekTotals.fats_g / daysWithMeals) : 0

  const prevAvgCal = prevDays > 0 ? Math.round(prevTotals.calories / prevDays) : 0
  const prevAvgCarbs = prevDays > 0 ? Math.round(prevTotals.carbs_g / prevDays) : 0
  const prevAvgProtein = prevDays > 0 ? Math.round(prevTotals.protein_g / prevDays) : 0
  const prevAvgFats = prevDays > 0 ? Math.round(prevTotals.fats_g / prevDays) : 0

  const carbsCal = weekTotals.carbs_g * 4
  const protCal = weekTotals.protein_g * 4
  const fatsCal = weekTotals.fats_g * 9
  const macroCalsTotal = carbsCal + protCal + fatsCal
  const carbsPct = macroCalsTotal > 0 ? Math.round((carbsCal / macroCalsTotal) * 100) : 0
  const protPct = macroCalsTotal > 0 ? Math.round((protCal / macroCalsTotal) * 100) : 0
  const fatPct = macroCalsTotal > 0 ? Math.round((fatsCal / macroCalsTotal) * 100) : 0

  const staticInsight = useMemo(() => generateWeeklyNote(weekTotals, profile, daysWithMeals), [weekTotals, profile, daysWithMeals])

  // Fetch AI insight when week data is ready
  useEffect(() => {
    if (loading || daysWithMeals === 0) { setAiInsight(null); return }
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey) return
    setInsightLoading(true)
    setAiInsight(null)
    generateWeekInsight({
      avgCal, calGoal: profile.calorie_goal,
      avgCarbs, carbsGoal: profile.carbs_goal_g,
      avgProtein, proteinGoal: profile.protein_goal_g,
      avgFats, fatsGoal: profile.fats_goal_g,
      daysLogged: daysWithMeals
    }, apiKey)
      .then(text => { if (text) setAiInsight(text) })
      .catch(() => {})
      .finally(() => setInsightLoading(false))
  }, [weekDates.join(','), loading, daysWithMeals])

  const weekLabel = (() => {
    const s = new Date(weekDates[0] + 'T12:00:00')
    const e = new Date(weekDates[6] + 'T12:00:00')
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  })()

  const handleExport = async () => {
    setExporting(true)
    try { await generateWeeklyPDF(weekDates, mealsByDate, profile) }
    catch (e) { alert('PDF export failed: ' + e.message) }
    finally { setExporting(false) }
  }

  function TrendBadge({ current, prev }) {
    if (!prev || prev === 0) return null
    const diff = current - prev
    const pct = Math.abs(Math.round((diff / prev) * 100))
    if (Math.abs(diff) < 2) return <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">→</span>
    if (diff > 0) return <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">↑{pct}%</span>
    return <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">↓{pct}%</span>
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-white">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <button onClick={() => { setWeekOffset(o => o - 1); setAiInsight(null) }} className="p-2 text-gray-500 active:text-green-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Week of</p>
            <p className="text-sm font-semibold text-gray-900">{weekLabel}</p>
          </div>
          <button onClick={() => { setWeekOffset(o => o + 1); setAiInsight(null) }} disabled={weekOffset >= 0} className="p-2 text-gray-500 active:text-green-600 disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-4 max-w-md mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : daysWithMeals === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <span className="text-4xl mb-3">📊</span>
            <p className="text-gray-500 text-sm font-medium">No meals logged this week</p>
            <p className="text-gray-400 text-xs mt-1">Start logging to see your trends</p>
          </div>
        ) : (
          <>
            {/* AI Insight */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✨</span>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Weekly Insight</p>
              </div>
              {insightLoading ? (
                <div className="flex items-center gap-2 text-sm text-blue-400">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating insight…
                </div>
              ) : (
                <p className="text-sm text-blue-900 leading-relaxed">{aiInsight || staticInsight}</p>
              )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Days Logged', value: `${daysWithMeals}/7`, sub: 'this week' },
                { label: 'Avg Calories', value: avgCal.toLocaleString(), sub: 'kcal/day' },
                { label: 'Calorie Goal', value: profile.calorie_goal.toLocaleString(), sub: 'kcal/day' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Dietary Balance */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm font-bold text-gray-900 mb-3">Dietary Balance</p>
              <div className="flex items-center gap-5">
                <DonutChart carbs={weekTotals.carbs_g} protein={weekTotals.protein_g} fats={weekTotals.fats_g} />
                <div className="flex-1 space-y-3">
                  {[
                    { label: 'Carbs', pct: carbsPct, color: '#3b82f6', avg: avgCarbs },
                    { label: 'Protein', pct: protPct, color: '#8b5cf6', avg: avgProtein },
                    { label: 'Fat', pct: fatPct, color: '#f97316', avg: avgFats },
                  ].map(({ label, pct, color, avg }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700">{label}</span>
                        <div className="text-right">
                          <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                          <span className="text-xs text-gray-400 ml-1">· {avg}g</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget & Intake */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-900">Budget & Intake</p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,2" /></svg>
                    Goal
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="#f97316" strokeWidth="2" /></svg>
                    Eaten
                  </span>
                </div>
              </div>
              <BudgetLineChart weekDates={weekDates} mealsByDate={mealsByDate} goal={profile.calorie_goal} />
            </div>

            {/* Meal Calories */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-900">Meal Calories</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-gray-900">{avgCal}</span>
                  <span className="text-xs text-gray-400">avg kcal</span>
                  {prevDays > 0 && <TrendBadge current={avgCal} prev={prevAvgCal} />}
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2">Daily goal: {profile.calorie_goal} kcal · dashed line</p>
              <CaloriesBarChart weekDates={weekDates} mealsByDate={mealsByDate} goal={profile.calorie_goal} />
            </div>

            {/* Per-macro cards */}
            {[
              { label: 'Carbs', macroKey: 'carbs_g', goalG: profile.carbs_goal_g, color: '#3b82f6', avg: avgCarbs, prevAvg: prevAvgCarbs },
              { label: 'Protein', macroKey: 'protein_g', goalG: profile.protein_goal_g, color: '#8b5cf6', avg: avgProtein, prevAvg: prevAvgProtein },
              { label: 'Fat', macroKey: 'fats_g', goalG: profile.fats_goal_g, color: '#f97316', avg: avgFats, prevAvg: prevAvgFats },
            ].map(({ label, macroKey, goalG, color, avg, prevAvg }) => {
              const targetPct = goalG > 0 ? Math.round((avg / goalG) * 100) : 0
              return (
                <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-gray-900">{label}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900">{avg}g</span>
                      <span className="text-xs text-gray-400">avg</span>
                      {prevDays > 0 && <TrendBadge current={avg} prev={prevAvg} />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Goal: {goalG}g · <span className="font-semibold" style={{ color }}>{targetPct}% of target</span>
                  </p>
                  <MacroDailyChart weekDates={weekDates} mealsByDate={mealsByDate} macroKey={macroKey} goalG={goalG} color={color} />
                </div>
              )
            })}

            {/* Export PDF */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full h-12 bg-green-600 text-white rounded-2xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating PDF…
                </>
              ) : '↓ Export Week PDF'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

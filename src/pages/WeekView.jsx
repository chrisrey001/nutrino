import { useState, useMemo, useEffect, useCallback } from 'react'
import { useMealsRange } from '../hooks/useMealsRange'
import { useProfile } from '../hooks/useProfile'
import NutrinoLogo from '../components/NutrinoLogo'
import { getWeekDates, sumMacros, toLocalDateString, generateWeeklyNote, formatTime } from '../lib/utils'
import { generateWeeklyPDF } from '../lib/pdf'
import { generateWeekInsight } from '../lib/gemini'
import {
  IconSparkles, IconChartBar, IconCalendarStats, IconFlame, IconTarget,
  IconChartDonut3, IconTrendingUp, IconBread, IconMeat, IconDroplet
} from '@tabler/icons-react'

const todayStr = toLocalDateString()
const INSIGHT_HOUR = 21 // 9pm

function insightCacheKey(weekKey) { return `nutrino_insight_${weekKey}` }

function loadCachedInsight(weekKey) {
  try {
    const raw = localStorage.getItem(insightCacheKey(weekKey))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveCachedInsight(weekKey, text) {
  localStorage.setItem(insightCacheKey(weekKey), JSON.stringify({ text, generatedAt: new Date().toISOString() }))
}

function isCacheStale(cached, isPastWeek) {
  if (!cached) return true
  if (isPastWeek) return false
  return new Date(cached.generatedAt).toDateString() !== new Date().toDateString()
}

function isPastNinepm() { return new Date().getHours() >= INSIGHT_HOUR }

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

  const weekKey = weekDates[0]
  const isPastWeek = weekDates[6] < todayStr

  const weekStats = useMemo(() => ({
    avgCal, calGoal: profile.calorie_goal,
    avgCarbs, carbsGoal: profile.carbs_goal_g,
    avgProtein, proteinGoal: profile.protein_goal_g,
    avgFats, fatsGoal: profile.fats_goal_g,
    daysLogged: daysWithMeals
  }), [avgCal, avgCarbs, avgProtein, avgFats, profile, daysWithMeals])

  // Load insight: use cache when fresh, auto-generate after 9pm or for past weeks
  useEffect(() => {
    if (loading || daysWithMeals === 0) { setAiInsight(null); return }

    const cached = loadCachedInsight(weekKey)
    const stale = isCacheStale(cached, isPastWeek)

    // Use cache if fresh, or if stale but before 9pm on current week (show yesterday's rather than nothing)
    if (cached && (!stale || (!isPastWeek && !isPastNinepm()))) {
      setAiInsight({ text: cached.text, generatedAt: cached.generatedAt })
      return
    }

    // Before 9pm on current week with no cache at all → show static, no API call
    if (!isPastWeek && !isPastNinepm() && !cached) return

    // Auto-generate: past week (always) or current week after 9pm or stale cache
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey) return
    setInsightLoading(true)
    generateWeekInsight(weekStats, apiKey)
      .then(text => {
        if (text) {
          saveCachedInsight(weekKey, text)
          setAiInsight({ text, generatedAt: new Date().toISOString() })
        }
      })
      .catch(() => {})
      .finally(() => setInsightLoading(false))
  }, [weekKey, loading, daysWithMeals])

  const handleRefreshInsight = useCallback(() => {
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey || insightLoading || daysWithMeals === 0) return
    setInsightLoading(true)
    generateWeekInsight(weekStats, apiKey)
      .then(text => {
        if (text) {
          saveCachedInsight(weekKey, text)
          setAiInsight({ text, generatedAt: new Date().toISOString() })
        }
      })
      .catch(() => {})
      .finally(() => setInsightLoading(false))
  }, [weekKey, weekStats, insightLoading, daysWithMeals])

  const weekLabel = (() => {
    const s = new Date(weekDates[0] + 'T12:00:00')
    const e = new Date(weekDates[6] + 'T12:00:00')
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  })()

  const handleExport = async () => {
    setExporting(true)
    try {
      const { blob, filename } = await generateWeeklyPDF(weekDates, mealsByDate, profile)
      const file = new File([blob], filename, { type: 'application/pdf' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Nutrino Weekly Report' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err.name !== 'AbortError') alert('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
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
    <div className="min-h-screen bg-white max-w-md mx-auto">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <button onClick={() => { setWeekOffset(o => o - 1); setAiInsight(null); setInsightLoading(false) }} className="p-2 text-gray-500 active:text-green-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <NutrinoLogo className="justify-center" />
            <p className="text-xs text-gray-500 mt-0.5">{weekLabel}</p>
          </div>
          <button onClick={() => { setWeekOffset(o => o + 1); setAiInsight(null); setInsightLoading(false) }} disabled={weekOffset >= 0} className="p-2 text-gray-500 active:text-green-600 disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Page content */}
      <div className="px-4 pt-4 pb-24 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : daysWithMeals === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <IconChartBar size={48} stroke={1} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">No meals logged this week</p>
            <p className="text-gray-400 text-xs mt-1">Start logging to see your trends</p>
          </div>
        ) : (
          <>
            {/* AI Insight */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <IconSparkles size={16} stroke={1.5} className="text-blue-500" />
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Weekly Insight</p>
                </div>
                {localStorage.getItem('gemini_api_key') && !insightLoading && daysWithMeals > 0 && (
                  <button onClick={handleRefreshInsight} className="text-blue-400 p-1 active:opacity-50" aria-label="Refresh insight">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
              {insightLoading ? (
                <div className="flex items-center gap-2 text-sm text-blue-400">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating insight…
                </div>
              ) : aiInsight ? (
                <>
                  <p className="text-sm text-blue-900 leading-relaxed">{aiInsight.text}</p>
                  <p className="text-xs text-blue-400 mt-2">
                    Updated {new Date(aiInsight.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTime(aiInsight.generatedAt)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-blue-900 leading-relaxed">{staticInsight}</p>
                  {!isPastNinepm() && localStorage.getItem('gemini_api_key') && daysWithMeals > 0 && (
                    <p className="text-xs text-blue-400 mt-2">AI summary updates at 9pm when the day is complete</p>
                  )}
                </>
              )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Days Logged', value: `${daysWithMeals}/7`, sub: 'this week', icon: <IconCalendarStats size={18} stroke={1.5} className="text-gray-400" /> },
                { label: 'Avg Calories', value: avgCal.toLocaleString(), sub: 'kcal/day', icon: <IconFlame size={18} stroke={1.5} className="text-teal-400" /> },
                { label: 'Calorie Goal', value: profile.calorie_goal.toLocaleString(), sub: 'kcal/day', icon: <IconTarget size={18} stroke={1.5} className="text-blue-400" /> },
              ].map(({ label, value, sub, icon }) => (
                <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center">
                  <div className="flex justify-center mb-1">{icon}</div>
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Dietary Balance */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <IconChartDonut3 size={16} stroke={1.5} className="text-gray-500" />
                <p className="text-sm font-bold text-gray-900">Dietary Balance</p>
              </div>
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
                <div className="flex items-center gap-1.5">
                  <IconTrendingUp size={16} stroke={1.5} className="text-gray-500" />
                  <p className="text-sm font-bold text-gray-900">Budget & Intake</p>
                </div>
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
                <div className="flex items-center gap-1.5">
                  <IconChartBar size={16} stroke={1.5} className="text-gray-500" />
                  <p className="text-sm font-bold text-gray-900">Meal Calories</p>
                </div>
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
              { label: 'Carbs', macroKey: 'carbs_g', goalG: profile.carbs_goal_g, color: '#3b82f6', avg: avgCarbs, prevAvg: prevAvgCarbs, icon: <IconBread size={15} stroke={1.5} color="#3b82f6" /> },
              { label: 'Protein', macroKey: 'protein_g', goalG: profile.protein_goal_g, color: '#8b5cf6', avg: avgProtein, prevAvg: prevAvgProtein, icon: <IconMeat size={15} stroke={1.5} color="#8b5cf6" /> },
              { label: 'Fat', macroKey: 'fats_g', goalG: profile.fats_goal_g, color: '#f97316', avg: avgFats, prevAvg: prevAvgFats, icon: <IconDroplet size={15} stroke={1.5} color="#f97316" /> },
            ].map(({ label, macroKey, goalG, color, avg, prevAvg, icon }) => {
              const targetPct = goalG > 0 ? Math.round((avg / goalG) * 100) : 0
              return (
                <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">{icon}<p className="text-sm font-bold text-gray-900">{label}</p></div>
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

            {/* Export / Share PDF */}
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
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Share / Download PDF
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

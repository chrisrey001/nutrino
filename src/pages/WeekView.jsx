import { useState, useMemo, useEffect, useCallback } from 'react'
import { useMealsRange } from '../hooks/useMealsRange'
import { useMealsMonth } from '../hooks/useMeals'
import { useProfile } from '../hooks/useProfile'
import NutrinoLogo from '../components/NutrinoLogo'
import EmptyState from '../components/EmptyState'
import {
  getWeekDates, getMonthDates, sumMacros, toLocalDateString,
  generateWeeklyNote, generateMonthlyNote, formatMonthYear, formatTime
} from '../lib/utils'
import { exportReport } from '../lib/pdf'
import { generateWeekInsight, generateMonthInsight } from '../lib/gemini'
import {
  IconSparkles, IconChartBar, IconCalendarStats, IconFlame, IconTarget,
  IconChartDonut3, IconTrendingUp, IconBread, IconMeat, IconDroplet, IconCheck
} from '@tabler/icons-react'

const todayStr = toLocalDateString()
const INSIGHT_HOUR = 21

function insightCacheKey(key) { return `nutrino_insight_${key}` }
function loadCachedInsight(key) {
  try { const r = localStorage.getItem(insightCacheKey(key)); return r ? JSON.parse(r) : null }
  catch { return null }
}
function saveCachedInsight(key, text) {
  localStorage.setItem(insightCacheKey(key), JSON.stringify({ text, generatedAt: new Date().toISOString() }))
}
function isCacheStale(cached, isPast) {
  if (!cached) return true
  if (isPast) return false
  return new Date(cached.generatedAt).toDateString() !== new Date().toDateString()
}
function isPastNinepm() { return new Date().getHours() >= INSIGHT_HOUR }
function isLastDayOfMonth() {
  const now = new Date()
  return now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

// --- SVG Chart Components ---

function DonutChart({ carbs, protein, fats }) {
  const carbsCal = carbs * 4, protCal = protein * 4, fatsCal = fats * 9
  const total = carbsCal + protCal + fatsCal
  const r = 42, cx = 60, cy = 60, sw = 14, circ = 2 * Math.PI * r, gap = 2
  if (total === 0) return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fill="#9ca3af">No data</text>
    </svg>
  )
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
  const slotW = plotW / 7, barW = slotW * 0.6
  const toX = i => pL + i * slotW + (slotW - barW) / 2
  const barH = v => Math.max(2, (v / maxCal) * plotH)
  const goalY = pT + plotH - (goal / maxCal) * plotH
  const labels = weekDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1))
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pL} y1={goalY} x2={W - pR} y2={goalY} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,2" />
      {dailyCals.map((c, i) => {
        const h = barH(c), x = toX(i), y = pT + plotH - h
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
  const slotW = plotW / 7, barW = slotW * 0.6
  const toX = i => pL + i * slotW + (slotW - barW) / 2
  const barH = v => Math.max(2, (v / maxVal) * plotH)
  const goalY = pT + plotH - (goalG / maxVal) * plotH
  const labels = weekDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1))
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pL} y1={goalY} x2={W - pR} y2={goalY} stroke={color} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.5} />
      {dailyVals.map((v, i) => {
        const h = barH(v), x = toX(i), y = pT + plotH - h
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

function MonthlyBarChart({ days, goal }) {
  const W = 320, H = 100
  const pL = 8, pR = 8, pT = 10, pB = 22
  const plotW = W - pL - pR, plotH = H - pT - pB
  const n = days.length
  const maxCal = Math.max(...days.map(d => d.calories), goal, 1) * 1.15
  const slotW = plotW / Math.max(n, 1)
  const barW = Math.max(2, slotW * 0.72)
  const toX = i => pL + i * slotW + (slotW - barW) / 2
  const barH = v => v > 0 ? Math.max(1.5, (v / maxCal) * plotH) : 0
  const goalY = pT + plotH - (goal / maxCal) * plotH
  const milestones = new Set([0, 6, 13, 20, 27])
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pL} y1={goalY} x2={W - pR} y2={goalY} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,2" />
      {days.map((d, i) => {
        const h = barH(d.calories)
        const x = toX(i), y = pT + plotH - h
        const pct = goal > 0 ? d.calories / goal : 0
        const fill = d.calories === 0 ? '#f3f4f6' : pct > 1.25 ? '#ef4444' : pct > 1.1 ? '#f59e0b' : '#22c55e'
        const dayNum = new Date(d.date + 'T12:00:00').getDate()
        return (
          <g key={i}>
            {h > 0 && <rect x={x} y={y} width={barW} height={h} rx={1} fill={fill} />}
            {milestones.has(i) && (
              <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">{dayNum}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function MonthlyMacroLineChart({ days }) {
  const W = 320, H = 130
  const pL = 8, pR = 8, pT = 12, pB = 22
  const plotW = W - pL - pR, plotH = H - pT - pB
  const n = days.length
  const maxVal = Math.max(...days.flatMap(d => [d.carbs_g, d.protein_g, d.fats_g]), 1) * 1.15
  const toX = i => pL + (i / Math.max(n - 1, 1)) * plotW
  const toY = v => pT + plotH - (v / maxVal) * plotH
  const makePts = key => days.map((d, i) => `${toX(i).toFixed(1)},${toY(d[key]).toFixed(1)}`).join(' ')
  const milestones = [0, 6, 13, 20, 27].filter(i => i < n)
  const lines = [
    { key: 'carbs_g', color: '#3b82f6' },
    { key: 'protein_g', color: '#8b5cf6' },
    { key: 'fats_g', color: '#f97316' },
  ]
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={pL} y1={toY(maxVal * t)} x2={W - pR} y2={toY(maxVal * t)} stroke="#f3f4f6" strokeWidth={1} />
      ))}
      {lines.map(({ key, color }) => (
        <polyline key={key} points={makePts(key)} fill="none" stroke={color}
          strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
      ))}
      {lines.map(({ key, color }) =>
        milestones.map(i => (
          <circle key={`${key}-${i}`} cx={toX(i)} cy={toY(days[i][key])} r={2.5} fill={color} />
        ))
      )}
      {milestones.map(i => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">
          {new Date(days[i].date + 'T12:00:00').getDate()}
        </text>
      ))}
    </svg>
  )
}

function WeekBreakdownTable({ monthDates, mealsByDate, goal }) {
  const weeks = []
  let current = []
  for (const d of monthDates) {
    const dow = (new Date(d + 'T12:00:00').getDay() + 6) % 7
    if (dow === 0 && current.length) { weeks.push(current); current = [] }
    current.push(d)
  }
  if (current.length) weeks.push(current)

  const weekData = weeks.map(week => {
    const logged = week.filter(d => (mealsByDate[d] || []).length > 0)
    const totals = sumMacros(logged.flatMap(d => mealsByDate[d] || []))
    return {
      week,
      logged,
      avgCal: logged.length > 0 ? Math.round(totals.calories / logged.length) : 0,
      avgProt: logged.length > 0 ? Math.round(totals.protein_g / logged.length) : 0,
    }
  })

  return (
    <div className="divide-y divide-gray-50">
      {weekData.map(({ week, logged, avgCal, avgProt }, wi) => {
        const prev = wi > 0 ? weekData[wi - 1] : null
        const calDiff = prev && prev.avgCal > 0 && avgCal > 0
          ? Math.round(((avgCal - prev.avgCal) / prev.avgCal) * 100) : null
        const s = new Date(week[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const e = new Date(week[week.length - 1] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const calPct = goal > 0 ? avgCal / goal : 0
        const calColor = avgCal === 0 ? 'text-gray-300' : calPct > 1.25 ? 'text-red-500' : calPct > 1.1 ? 'text-amber-500' : 'text-green-600'
        return (
          <div key={wi} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-xs font-semibold text-gray-700">{s} – {e}</p>
              <p className="text-xs text-gray-400">{logged.length}/{week.length} days logged</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <p className={`text-sm font-bold ${calColor}`}>{avgCal > 0 ? avgCal.toLocaleString() : '—'}</p>
                  {calDiff !== null && (
                    Math.abs(calDiff) < 2
                      ? <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">→</span>
                      : calDiff > 0
                        ? <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">↑{Math.abs(calDiff)}%</span>
                        : <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">↓{Math.abs(calDiff)}%</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">kcal avg</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-purple-600">{avgProt > 0 ? `${avgProt}g` : '—'}</p>
                <p className="text-xs text-gray-400">protein</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TrendBadge({ current, prev }) {
  if (!prev || prev === 0) return null
  const diff = current - prev
  const pct = Math.abs(Math.round((diff / prev) * 100))
  if (Math.abs(diff) < 2) return <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">→</span>
  if (diff > 0) return <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">↑{pct}%</span>
  return <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">↓{pct}%</span>
}

function RefreshButton({ onClick }) {
  return (
    <button onClick={onClick} className="text-blue-400 p-1 active:opacity-50" aria-label="Refresh insight">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  )
}

function InsightCard({ label, insight, loading, staticText, showUpdateHint, onRefresh, hasApiKey }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <IconSparkles size={16} stroke={1.5} className="text-blue-500" />
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">{label}</p>
        </div>
        {hasApiKey && !loading && <RefreshButton onClick={onRefresh} />}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-blue-400">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Generating insight…
        </div>
      ) : insight ? (
        <>
          <p className="text-sm text-blue-900 leading-relaxed">{insight.text}</p>
          <p className="text-xs text-blue-400 mt-2">
            Updated {new Date(insight.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTime(insight.generatedAt)}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-blue-900 leading-relaxed">{staticText}</p>
          {showUpdateHint && hasApiKey && (
            <p className="text-xs text-blue-400 mt-2">{showUpdateHint}</p>
          )}
        </>
      )}
    </div>
  )
}

// --- Main Component ---

export default function WeekView() {
  const [viewMode, setViewMode] = useState('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [aiInsight, setAiInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [monthAiInsight, setMonthAiInsight] = useState(null)
  const [monthInsightLoading, setMonthInsightLoading] = useState(false)
  const { profile } = useProfile()

  // --- Weekly data ---
  const refDate = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); return d }, [weekOffset])
  const weekDates = useMemo(() => getWeekDates(refDate), [refDate])
  const { mealsByDate, loading } = useMealsRange(weekDates)

  const prevWeekDates = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + (weekOffset - 1) * 7); return getWeekDates(d)
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

  const carbsCal = weekTotals.carbs_g * 4, protCal = weekTotals.protein_g * 4, fatsCal = weekTotals.fats_g * 9
  const macroCalsTotal = carbsCal + protCal + fatsCal
  const carbsPct = macroCalsTotal > 0 ? Math.round((carbsCal / macroCalsTotal) * 100) : 0
  const protPct = macroCalsTotal > 0 ? Math.round((protCal / macroCalsTotal) * 100) : 0
  const fatPct = macroCalsTotal > 0 ? Math.round((fatsCal / macroCalsTotal) * 100) : 0

  const weekKey = weekDates[0]
  const isPastWeek = weekDates[6] < todayStr
  const staticInsight = useMemo(() => generateWeeklyNote(weekTotals, profile, daysWithMeals), [weekTotals, profile, daysWithMeals])
  const weekStats = useMemo(() => ({
    avgCal, calGoal: profile.calorie_goal,
    avgCarbs, carbsGoal: profile.carbs_goal_g,
    avgProtein, proteinGoal: profile.protein_goal_g,
    avgFats, fatsGoal: profile.fats_goal_g,
    daysLogged: daysWithMeals
  }), [avgCal, avgCarbs, avgProtein, avgFats, profile, daysWithMeals])

  const weekLabel = useMemo(() => {
    const s = new Date(weekDates[0] + 'T12:00:00')
    const e = new Date(weekDates[6] + 'T12:00:00')
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }, [weekDates])

  // --- Monthly data ---
  const monthDates = useMemo(() => getMonthDates(monthOffset), [monthOffset])
  const { mealsByDate: monthMealsByDate, loading: monthLoading } = useMealsMonth(monthOffset)

  const monthAllMeals = useMemo(() => monthDates.flatMap(d => monthMealsByDate[d] || []), [monthMealsByDate, monthDates])
  const monthTotals = useMemo(() => sumMacros(monthAllMeals), [monthAllMeals])
  const monthDaysWithMeals = useMemo(() => monthDates.filter(d => (monthMealsByDate[d] || []).length > 0).length, [monthMealsByDate, monthDates])

  const monthAvgCal = monthDaysWithMeals > 0 ? Math.round(monthTotals.calories / monthDaysWithMeals) : 0
  const monthAvgCarbs = monthDaysWithMeals > 0 ? Math.round(monthTotals.carbs_g / monthDaysWithMeals) : 0
  const monthAvgProtein = monthDaysWithMeals > 0 ? Math.round(monthTotals.protein_g / monthDaysWithMeals) : 0
  const monthAvgFats = monthDaysWithMeals > 0 ? Math.round(monthTotals.fats_g / monthDaysWithMeals) : 0

  const monthKey = monthDates.length > 0 ? monthDates[0].slice(0, 7) : ''
  const isPastMonth = monthDates.length > 0 && monthDates[monthDates.length - 1] < todayStr
  const monthLabel = monthDates.length > 0 ? formatMonthYear(monthDates[0]) : ''

  const dailyCalData = useMemo(() => monthDates.map(d => ({
    date: d, calories: sumMacros(monthMealsByDate[d] || []).calories
  })), [monthDates, monthMealsByDate])

  const dailyMacroData = useMemo(() => monthDates.map(d => {
    const t = sumMacros(monthMealsByDate[d] || [])
    return { date: d, carbs_g: Math.round(t.carbs_g), protein_g: Math.round(t.protein_g), fats_g: Math.round(t.fats_g) }
  }), [monthDates, monthMealsByDate])

  const monthDaysWithCals = dailyCalData.filter(d => d.calories > 0)
  const adherencePct = monthDaysWithCals.length > 0
    ? Math.round((monthDaysWithCals.filter(d => Math.abs(d.calories - profile.calorie_goal) / profile.calorie_goal <= 0.1).length / monthDaysWithCals.length) * 100)
    : 0

  const mCarbsCal = monthTotals.carbs_g * 4, mProtCal = monthTotals.protein_g * 4, mFatsCal = monthTotals.fats_g * 9
  const mMacroCalsTotal = mCarbsCal + mProtCal + mFatsCal
  const mCarbsPct = mMacroCalsTotal > 0 ? Math.round((mCarbsCal / mMacroCalsTotal) * 100) : 0
  const mProtPct = mMacroCalsTotal > 0 ? Math.round((mProtCal / mMacroCalsTotal) * 100) : 0
  const mFatPct = mMacroCalsTotal > 0 ? Math.round((mFatsCal / mMacroCalsTotal) * 100) : 0

  const staticMonthInsight = useMemo(() => generateMonthlyNote(monthTotals, profile, monthDaysWithMeals, monthDates.length), [monthTotals, profile, monthDaysWithMeals, monthDates.length])
  const monthStats = useMemo(() => ({
    avgCal: monthAvgCal, calGoal: profile.calorie_goal,
    avgCarbs: monthAvgCarbs, carbsGoal: profile.carbs_goal_g,
    avgProtein: monthAvgProtein, proteinGoal: profile.protein_goal_g,
    avgFats: monthAvgFats, fatsGoal: profile.fats_goal_g,
    daysLogged: monthDaysWithMeals, totalDays: monthDates.length
  }), [monthAvgCal, monthAvgCarbs, monthAvgProtein, monthAvgFats, profile, monthDaysWithMeals, monthDates.length])

  // --- Weekly insight effect ---
  useEffect(() => {
    if (loading || daysWithMeals === 0) { setAiInsight(null); return }
    const cached = loadCachedInsight(`week_${weekKey}`)
    const stale = isCacheStale(cached, isPastWeek)
    if (cached && (!stale || (!isPastWeek && !isPastNinepm()))) {
      setAiInsight({ text: cached.text, generatedAt: cached.generatedAt }); return
    }
    if (!isPastWeek && !isPastNinepm() && !cached) return
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey) return
    setInsightLoading(true)
    generateWeekInsight(weekStats, apiKey)
      .then(text => { if (text) { saveCachedInsight(`week_${weekKey}`, text); setAiInsight({ text, generatedAt: new Date().toISOString() }) } })
      .catch(() => {})
      .finally(() => setInsightLoading(false))
  }, [weekKey, loading, daysWithMeals])

  // --- Monthly insight effect ---
  useEffect(() => {
    if (viewMode !== 'month' || monthLoading || monthDaysWithMeals === 0) { setMonthAiInsight(null); return }
    const cached = loadCachedInsight(`month_${monthKey}`)
    const stale = isCacheStale(cached, isPastMonth)
    if (cached && !stale) { setMonthAiInsight({ text: cached.text, generatedAt: cached.generatedAt }); return }
    if (!isPastMonth && !isLastDayOfMonth()) {
      if (cached) setMonthAiInsight({ text: cached.text, generatedAt: cached.generatedAt })
      return
    }
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey) return
    setMonthInsightLoading(true)
    generateMonthInsight(monthStats, apiKey)
      .then(text => { if (text) { saveCachedInsight(`month_${monthKey}`, text); setMonthAiInsight({ text, generatedAt: new Date().toISOString() }) } })
      .catch(() => {})
      .finally(() => setMonthInsightLoading(false))
  }, [monthKey, viewMode, monthLoading, monthDaysWithMeals])

  const handleRefreshInsight = useCallback(() => {
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey || insightLoading || daysWithMeals === 0) return
    setInsightLoading(true)
    generateWeekInsight(weekStats, apiKey)
      .then(text => { if (text) { saveCachedInsight(`week_${weekKey}`, text); setAiInsight({ text, generatedAt: new Date().toISOString() }) } })
      .catch(() => {})
      .finally(() => setInsightLoading(false))
  }, [weekKey, weekStats, insightLoading, daysWithMeals])

  const handleRefreshMonthInsight = useCallback(() => {
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey || monthInsightLoading || monthDaysWithMeals === 0) return
    setMonthInsightLoading(true)
    generateMonthInsight(monthStats, apiKey)
      .then(text => { if (text) { saveCachedInsight(`month_${monthKey}`, text); setMonthAiInsight({ text, generatedAt: new Date().toISOString() }) } })
      .catch(() => {})
      .finally(() => setMonthInsightLoading(false))
  }, [monthKey, monthStats, monthInsightLoading, monthDaysWithMeals])

  const handlePrev = () => {
    if (viewMode === 'week') { setWeekOffset(o => o - 1); setAiInsight(null); setInsightLoading(false) }
    else { setMonthOffset(o => o - 1); setMonthAiInsight(null); setMonthInsightLoading(false) }
  }
  const handleNext = () => {
    if (viewMode === 'week') { setWeekOffset(o => o + 1); setAiInsight(null); setInsightLoading(false) }
    else { setMonthOffset(o => o + 1); setMonthAiInsight(null); setMonthInsightLoading(false) }
  }
  const isAtPresent = viewMode === 'week' ? weekOffset >= 0 : monthOffset >= 0

  const handleExport = async () => {
    setExportError(null); setExporting(true)
    try { await exportReport(weekDates, mealsByDate, profile) }
    catch { setExportError('Could not generate the report. Please try again.') }
    finally { setExporting(false) }
  }

  const isWeekly = viewMode === 'week'
  const hasApiKey = !!localStorage.getItem('gemini_api_key')
  const currentLoading = isWeekly ? loading : monthLoading
  const currentEmpty = isWeekly ? daysWithMeals === 0 : monthDaysWithMeals === 0

  return (
    <div className="bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-3 sticky top-0 z-10 shadow-sm">
        {/* Line 1: branding */}
        <div className="flex items-center justify-between">
          <NutrinoLogo />
          <span className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">Analytics</span>
        </div>
        {/* Line 2: nav arrows flanking the Weekly/Monthly toggle */}
        <div className="flex items-center justify-between mt-2">
          <button onClick={handlePrev} className="p-2 text-gray-500 active:text-green-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('week')}
              className={`px-5 py-1.5 rounded-[10px] text-sm font-medium transition-all ${isWeekly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >Weekly</button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-5 py-1.5 rounded-[10px] text-sm font-medium transition-all ${!isWeekly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >Monthly</button>
          </div>
          <button onClick={handleNext} disabled={isAtPresent} className="p-2 text-gray-500 active:text-green-600 disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {/* Date range context */}
        <p className="text-xs text-center text-gray-400 mt-1.5">{isWeekly ? weekLabel : monthLabel}</p>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-4">
        {currentLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : currentEmpty ? (
          <EmptyState
            icon={<IconChartBar size={32} stroke={1.5} />}
            title={`No meals logged ${isWeekly ? 'this week' : 'this month'}`}
            subtitle="Start logging to see your trends"
          />
        ) : isWeekly ? (

          /* ━━━━━━━━━━━━  WEEKLY VIEW  ━━━━━━━━━━━━ */
          <>
            <InsightCard
              label="Weekly Insight"
              insight={aiInsight}
              loading={insightLoading}
              staticText={staticInsight}
              showUpdateHint={!isPastNinepm() ? 'AI summary updates at 9pm when the day is complete' : null}
              onRefresh={handleRefreshInsight}
              hasApiKey={hasApiKey}
            />

            <div className="grid grid-cols-3 gap-2">
              {[
                { value: `${daysWithMeals}/7`, sub: 'this week', icon: <IconCalendarStats size={18} stroke={1.5} className="text-gray-400" /> },
                { value: avgCal.toLocaleString(), sub: 'kcal/day', icon: <IconFlame size={18} stroke={1.5} className="text-teal-400" /> },
                { value: profile.calorie_goal.toLocaleString(), sub: 'kcal goal', icon: <IconTarget size={18} stroke={1.5} className="text-blue-400" /> },
              ].map(({ value, sub, icon }, i) => (
                <div key={i} className="bg-white rounded-2xl p-3 text-center border border-gray-200 shadow-sm">
                  <div className="flex justify-center mb-1">{icon}</div>
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
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

            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
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

            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
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

            {[
              { label: 'Carbs', macroKey: 'carbs_g', goalG: profile.carbs_goal_g, color: '#3b82f6', avg: avgCarbs, prevAvg: prevAvgCarbs, icon: <IconBread size={15} stroke={1.5} color="#3b82f6" /> },
              { label: 'Protein', macroKey: 'protein_g', goalG: profile.protein_goal_g, color: '#8b5cf6', avg: avgProtein, prevAvg: prevAvgProtein, icon: <IconMeat size={15} stroke={1.5} color="#8b5cf6" /> },
              { label: 'Fat', macroKey: 'fats_g', goalG: profile.fats_goal_g, color: '#f97316', avg: avgFats, prevAvg: prevAvgFats, icon: <IconDroplet size={15} stroke={1.5} color="#f97316" /> },
            ].map(({ label, macroKey, goalG, color, avg, prevAvg, icon }) => {
              const targetPct = goalG > 0 ? Math.round((avg / goalG) * 100) : 0
              return (
                <div key={label} className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
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

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl text-sm font-semibold shadow-md shadow-green-600/30 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Preparing report…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Save / Share Report
                </>
              )}
            </button>
            {exportError ? (
              <p className="text-xs text-red-500 text-center mt-2">{exportError}</p>
            ) : (
              <p className="text-xs text-gray-400 text-center mt-2">Opens the iOS share sheet — choose Mail, Messages, or Save to Files.</p>
            )}
          </>

        ) : (

          /* ━━━━━━━━━━━━  MONTHLY VIEW  ━━━━━━━━━━━━ */
          <>
            <InsightCard
              label="Monthly Insight"
              insight={monthAiInsight}
              loading={monthInsightLoading}
              staticText={staticMonthInsight}
              showUpdateHint={!isPastMonth && !isLastDayOfMonth() ? 'AI summary generates on the last day of the month' : null}
              onRefresh={handleRefreshMonthInsight}
              hasApiKey={hasApiKey}
            />

            {/* Monthly summary stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  value: `${monthDaysWithMeals}/${monthDates.length}`,
                  sub: 'days logged',
                  icon: <IconCalendarStats size={18} stroke={1.5} className="text-gray-400" />
                },
                {
                  value: monthAvgCal > 0 ? monthAvgCal.toLocaleString() : '—',
                  sub: 'avg kcal/day',
                  icon: <IconFlame size={18} stroke={1.5} className="text-teal-400" />,
                  valueColor: monthAvgCal === 0 ? '' : monthAvgCal / profile.calorie_goal > 1.1 ? 'text-amber-500' : 'text-gray-900'
                },
                {
                  value: monthAvgProtein > 0 ? `${monthAvgProtein}g` : '—',
                  sub: 'avg protein/day',
                  icon: <IconMeat size={18} stroke={1.5} color="#8b5cf6" />,
                  valueColor: 'text-purple-600'
                },
                {
                  value: monthDaysWithCals.length > 0 ? `${adherencePct}%` : '—',
                  sub: 'days on target',
                  icon: <IconCheck size={18} stroke={1.5} className="text-green-500" />,
                  valueColor: adherencePct >= 80 ? 'text-green-600' : adherencePct >= 50 ? 'text-amber-500' : 'text-red-500'
                },
              ].map(({ value, sub, icon, valueColor = 'text-gray-900' }, i) => (
                <div key={i} className="bg-white rounded-2xl p-3 text-center border border-gray-200 shadow-sm">
                  <div className="flex justify-center mb-1">{icon}</div>
                  <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Monthly calorie trend */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <IconChartBar size={16} stroke={1.5} className="text-gray-500" />
                  <p className="text-sm font-bold text-gray-900">Daily Calories</p>
                </div>
                <span className="text-xs text-gray-400">{monthDates.length} days</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">Goal: {profile.calorie_goal} kcal · dashed line</p>
              <MonthlyBarChart days={dailyCalData} goal={profile.calorie_goal} />
            </div>

            {/* Monthly macro trends line chart */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <IconTrendingUp size={16} stroke={1.5} className="text-gray-500" />
                <p className="text-sm font-bold text-gray-900">Macro Trends</p>
              </div>
              <div className="flex items-center gap-4 mb-2">
                {[
                  { label: 'Carbs', color: '#3b82f6' },
                  { label: 'Protein', color: '#8b5cf6' },
                  { label: 'Fat', color: '#f97316' },
                ].map(({ label, color }) => (
                  <span key={label} className="flex items-center gap-1 text-xs text-gray-500">
                    <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={color} strokeWidth="2" /></svg>
                    {label}
                  </span>
                ))}
              </div>
              <MonthlyMacroLineChart days={dailyMacroData} />
            </div>

            {/* Week-by-week breakdown */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <IconTrendingUp size={16} stroke={1.5} className="text-gray-500" />
                <p className="text-sm font-bold text-gray-900">Week by Week</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">Average daily figures per calendar week</p>
              <WeekBreakdownTable monthDates={monthDates} mealsByDate={monthMealsByDate} goal={profile.calorie_goal} />
            </div>

            {/* Monthly macro split */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <IconChartDonut3 size={16} stroke={1.5} className="text-gray-500" />
                <p className="text-sm font-bold text-gray-900">Macro Split</p>
              </div>
              <div className="flex items-center gap-5">
                <DonutChart carbs={monthTotals.carbs_g} protein={monthTotals.protein_g} fats={monthTotals.fats_g} />
                <div className="flex-1 space-y-3">
                  {[
                    { label: 'Carbs', pct: mCarbsPct, color: '#3b82f6', actual: Math.round(monthTotals.carbs_g), monthGoal: profile.carbs_goal_g * monthDates.length },
                    { label: 'Protein', pct: mProtPct, color: '#8b5cf6', actual: Math.round(monthTotals.protein_g), monthGoal: profile.protein_goal_g * monthDates.length },
                    { label: 'Fat', pct: mFatPct, color: '#f97316', actual: Math.round(monthTotals.fats_g), monthGoal: profile.fats_goal_g * monthDates.length },
                  ].map(({ label, pct, color, actual, monthGoal }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700">{label}</span>
                        <div className="text-right">
                          <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                          <span className="text-xs text-gray-400 ml-1">· {actual.toLocaleString()}g / {monthGoal.toLocaleString()}g</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

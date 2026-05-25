import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMealsRange } from '../hooks/useMealsRange'
import { useProfile } from '../hooks/useProfile'
import MacroBar from '../components/MacroBar'
import MealCard from '../components/MealCard'
import { getWeekDates, sumMacros, toLocalDateString, formatShortDate, MEAL_TYPES, formatTime, macroBarColor } from '../lib/utils'
import { generateWeeklyPDF } from '../lib/pdf'

const todayStr = toLocalDateString()

function formatMinutes(mins) {
  const h = Math.floor(mins / 60), m = mins % 60
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`
}

export default function WeekView() {
  const navigate = useNavigate()
  const [weekOffset, setWeekOffset] = useState(0)
  const [expanded, setExpanded] = useState({})
  const [exporting, setExporting] = useState(false)
  const { profile } = useProfile()

  const refDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])

  const weekDates = useMemo(() => getWeekDates(refDate), [refDate])
  const { mealsByDate, loading } = useMealsRange(weekDates)

  const allMeals = useMemo(
    () => weekDates.flatMap(d => mealsByDate[d] || []),
    [mealsByDate, weekDates]
  )

  const weekTotals = useMemo(() => sumMacros(allMeals), [allMeals])
  const daysWithMeals = weekDates.filter(d => (mealsByDate[d] || []).length > 0).length
  const avgCal = daysWithMeals > 0 ? Math.round(weekTotals.calories / daysWithMeals) : 0

  // Days on-target: calories within 80–115% of goal
  const onTargetDays = weekDates.filter(d => {
    const meals = mealsByDate[d] || []
    if (!meals.length) return false
    const cal = sumMacros(meals).calories
    const pct = cal / profile.calorie_goal
    return pct >= 0.8 && pct <= 1.15
  }).length

  // Meal type breakdown (types with count > 0)
  const mealTypeCounts = useMemo(() =>
    MEAL_TYPES.map(mt => ({ ...mt, count: allMeals.filter(m => m.meal_type === mt.value).length }))
      .filter(mt => mt.count > 0),
    [allMeals]
  )

  // Average eating time per meal type
  const avgEatingTimes = useMemo(() => {
    const byType = {}
    allMeals.forEach(meal => {
      const t = new Date(meal.created_at)
      const mins = t.getHours() * 60 + t.getMinutes()
      ;(byType[meal.meal_type] = byType[meal.meal_type] || []).push(mins)
    })
    return Object.fromEntries(
      Object.entries(byType).map(([type, arr]) => {
        const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        return [type, formatMinutes(avg)]
      })
    )
  }, [allMeals])

  const weekLabel = (() => {
    const start = new Date(weekDates[0] + 'T12:00:00')
    const end = new Date(weekDates[6] + 'T12:00:00')
    const sm = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const em = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${sm} – ${em}`
  })()

  const handleExport = async () => {
    setExporting(true)
    try {
      await generateWeeklyPDF(weekDates, mealsByDate, profile)
    } catch (e) {
      alert('PDF export failed: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const toggleDay = (date) => setExpanded(prev => ({ ...prev, [date]: !prev[date] }))

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Sticky week header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 text-gray-500 active:text-green-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Week of</p>
            <p className="text-sm font-semibold text-gray-900">{weekLabel}</p>
          </div>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            disabled={weekOffset >= 0}
            className="p-2 text-gray-500 active:text-green-600 disabled:opacity-30"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Stats strip */}
        {daysWithMeals > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 bg-gray-50 rounded-xl px-3 py-2">
            <span>📅 <span className="font-semibold text-gray-700">{daysWithMeals}/7</span> days</span>
            <span className="text-gray-300">·</span>
            <span>🍽️ <span className="font-semibold text-gray-700">{allMeals.length}</span> meals</span>
            <span className="text-gray-300">·</span>
            <span>🎯 <span className="font-semibold text-gray-700">{onTargetDays}</span> on-target</span>
          </div>
        )}

        {/* Avg calories */}
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-2xl font-bold text-gray-900">{avgCal}</span>
          <span className="text-sm text-gray-400">avg kcal / day</span>
          <span className="text-sm text-gray-300 mx-1">·</span>
          <span className="text-sm text-gray-400">goal {profile.calorie_goal}</span>
        </div>

        {/* Macro bars with per-nutrient colors */}
        <div className="space-y-2 mb-3">
          <MacroBar
            label="Carbs (avg)"
            eaten={daysWithMeals > 0 ? Math.round(weekTotals.carbs_g / daysWithMeals) : 0}
            goal={profile.carbs_goal_g}
            color="bg-blue-500"
          />
          <MacroBar
            label="Protein (avg)"
            eaten={daysWithMeals > 0 ? Math.round(weekTotals.protein_g / daysWithMeals) : 0}
            goal={profile.protein_goal_g}
            color="bg-orange-400"
          />
          <MacroBar
            label="Fat (avg)"
            eaten={daysWithMeals > 0 ? Math.round(weekTotals.fats_g / daysWithMeals) : 0}
            goal={profile.fats_goal_g}
            color="bg-violet-500"
          />
        </div>

        {/* Meal type breakdown */}
        {mealTypeCounts.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
            {mealTypeCounts.map(mt => (
              <div key={mt.value} className="flex-shrink-0 flex items-center gap-1 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs">
                <span>{mt.emoji}</span>
                <span className="font-semibold text-gray-700">{mt.count}</span>
                {avgEatingTimes[mt.value] && (
                  <span className="text-gray-400 ml-0.5">@ {avgEatingTimes[mt.value]}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={exporting || daysWithMeals === 0}
          className="w-full h-10 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
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
      </div>

      {/* Scrollable day list */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        ) : weekDates.map(date => {
          const meals = mealsByDate[date] || []
          const t = sumMacros(meals)
          const isToday = date === todayStr
          const isExpanded = expanded[date]
          const d = new Date(date + 'T12:00:00')
          const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

          // Per-day calorie bar
          const calPct = profile.calorie_goal > 0 ? Math.min(100, Math.round((t.calories / profile.calorie_goal) * 100)) : 0
          const calBarColor = macroBarColor(t.calories, profile.calorie_goal)

          // Eating window
          let eatingWindow = ''
          if (meals.length >= 2) {
            const times = meals.map(m => new Date(m.created_at)).sort((a, b) => a - b)
            eatingWindow = `${formatTime(times[0].toISOString())}–${formatTime(times[times.length - 1].toISOString())}`
          } else if (meals.length === 1) {
            eatingWindow = formatTime(meals[0].created_at)
          }

          return (
            <div
              key={date}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isToday ? 'ring-2 ring-green-500' : ''}`}
            >
              {/* Day header row */}
              <button
                className="w-full px-4 py-3 flex items-center justify-between text-left"
                onClick={() => toggleDay(date)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-semibold ${isToday ? 'text-green-600' : 'text-gray-800'}`}>
                      {dayLabel}
                    </span>
                    {isToday && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Today</span>}
                  </div>
                  {meals.length > 0 ? (
                    <>
                      <p className="text-xs text-gray-500">
                        {t.calories} kcal · {meals.length} meal{meals.length !== 1 ? 's' : ''}
                        {eatingWindow ? ` · ${eatingWindow}` : ''}
                      </p>
                      {/* Per-day calorie sparkline */}
                      <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                        <div className={`h-1 rounded-full ${calBarColor}`} style={{ width: `${calPct}%` }} />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">No meals logged</p>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded meals */}
              {isExpanded && meals.length > 0 && (
                <div className="border-t border-gray-100 px-3 pb-3 pt-2 space-y-2">
                  {meals.map(meal => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      compact
                      onClick={() => navigate(`/day/${date}`)}
                    />
                  ))}
                </div>
              )}

              {isExpanded && meals.length === 0 && (
                <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">
                  No meals — tap + on Today to log meals for this day.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

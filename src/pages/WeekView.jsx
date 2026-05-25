import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMealsRange } from '../hooks/useMealsRange'
import { useProfile } from '../hooks/useProfile'
import MacroBar from '../components/MacroBar'
import MealCard from '../components/MealCard'
import { getWeekDates, sumMacros, toLocalDateString, formatShortDate } from '../lib/utils'
import { generateWeeklyPDF } from '../lib/pdf'

const todayStr = toLocalDateString()

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

  const weekTotals = useMemo(() => {
    const allMeals = weekDates.flatMap(d => mealsByDate[d] || [])
    return sumMacros(allMeals)
  }, [mealsByDate, weekDates])

  const daysWithMeals = weekDates.filter(d => (mealsByDate[d] || []).length > 0).length

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

  const toggleDay = (date) => {
    setExpanded(prev => ({ ...prev, [date]: !prev[date] }))
  }

  const avgCal = daysWithMeals > 0 ? Math.round(weekTotals.calories / daysWithMeals) : 0

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

        {/* Weekly calorie total */}
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-2xl font-bold text-gray-900">{avgCal}</span>
          <span className="text-sm text-gray-400">avg kcal / day</span>
          <span className="text-sm text-gray-300 mx-1">·</span>
          <span className="text-sm text-gray-400">goal {profile.calorie_goal}</span>
        </div>

        <div className="space-y-2 mb-3">
          <MacroBar
            label="Carbs (avg)"
            eaten={daysWithMeals > 0 ? Math.round(weekTotals.carbs_g / daysWithMeals) : 0}
            goal={profile.carbs_goal_g}
          />
          <MacroBar
            label="Protein (avg)"
            eaten={daysWithMeals > 0 ? Math.round(weekTotals.protein_g / daysWithMeals) : 0}
            goal={profile.protein_goal_g}
          />
          <MacroBar
            label="Fat (avg)"
            eaten={daysWithMeals > 0 ? Math.round(weekTotals.fats_g / daysWithMeals) : 0}
            goal={profile.fats_goal_g}
          />
        </div>

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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isToday ? 'text-green-600' : 'text-gray-800'}`}>
                      {dayLabel}
                      {isToday && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Today</span>}
                    </span>
                  </div>
                  {meals.length > 0 ? (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t.calories} kcal &nbsp;·&nbsp; {meals.length} meal{meals.length !== 1 ? 's' : ''}
                      &nbsp;·&nbsp; {Math.round(t.carbs_g)}C {Math.round(t.protein_g)}P {Math.round(t.fats_g)}F
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">No meals logged</p>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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

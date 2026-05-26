import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { useProfile } from '../hooks/useProfile'
import MealCard from '../components/MealCard'
import MealDetailModal from '../components/MealDetailModal'
import EditMealModal from '../components/EditMealModal'
import NutrinoLogo from '../components/NutrinoLogo'
import { CaloriesCard, MacrosCard } from '../components/DayStats'
import { sumMacros, toLocalDateString } from '../lib/utils'
import { supabase } from '../lib/supabase'

const todayStr = toLocalDateString()

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toLocalDateString(d)
}

export default function DayDetail() {
  const { date } = useParams()
  const navigate = useNavigate()
  const { meals, loading, refresh } = useMeals(date)
  const { profile } = useProfile()
  const totals = sumMacros(meals)
  const [viewingMeal, setViewingMeal] = useState(null)
  const [editingMeal, setEditingMeal] = useState(null)

  const isToday = date === todayStr
  const canGoNext = date < todayStr

  const dayLabel = isToday
    ? 'TODAY'
    : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()

  const handleDelete = async (id) => {
    await supabase.from('meals').delete().eq('id', id)
    refresh()
  }

  const handleLogAgain = (meal) => {
    navigate(`/log?type=${meal.meal_type}&desc=${encodeURIComponent(meal.description || '')}`)
  }

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto">
      {/* Sticky date nav */}
      <div className="bg-white sticky top-0 z-10 px-4 pt-10 pb-3 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/day/${shiftDate(date, -1)}`)}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-2xl text-gray-600 active:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <NutrinoLogo className="justify-center" />
            <p className="text-xs text-gray-500 mt-0.5">{dayLabel}</p>
          </div>

          <button
            onClick={() => canGoNext && navigate(`/day/${shiftDate(date, 1)}`)}
            disabled={!canGoNext}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-2xl text-gray-600 active:bg-gray-200 transition-colors disabled:opacity-30"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-4 pt-4 pb-28 space-y-4">
        <CaloriesCard eaten={totals.calories} goal={profile.calorie_goal} />
        <MacrosCard
          carbs={totals.carbs_g} carbsGoal={profile.carbs_goal_g}
          protein={totals.protein_g} proteinGoal={profile.protein_goal_g}
          fats={totals.fats_g} fatsGoal={profile.fats_goal_g}
        />

        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        ) : meals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <span className="text-4xl mb-3">🍽️</span>
            <p className="text-gray-500 text-sm">No meals logged for this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map(meal => (
              <MealCard
                key={meal.id}
                meal={meal}
                onClick={() => setViewingMeal(meal)}
                onAdd={() => navigate(`/log?type=${meal.meal_type}`)}
              />
            ))}
          </div>
        )}
      </div>

      {viewingMeal && (
        <MealDetailModal
          meal={viewingMeal}
          onClose={() => setViewingMeal(null)}
          onEdit={meal => { setViewingMeal(null); setEditingMeal(meal) }}
          onDelete={id => { handleDelete(id); setViewingMeal(null) }}
          onLogAgain={!isToday ? handleLogAgain : undefined}
        />
      )}

      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          onClose={() => setEditingMeal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

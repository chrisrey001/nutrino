import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { useProfile } from '../hooks/useProfile'
import MealCard from '../components/MealCard'
import MealDetailModal from '../components/MealDetailModal'
import EditMealModal from '../components/EditMealModal'
import { CaloriesCard, MacrosCard } from '../components/DayStats'
import { toLocalDateString, sumMacros } from '../lib/utils'
import { supabase } from '../lib/supabase'

const today = toLocalDateString()

export default function Dashboard() {
  const { meals, loading, refresh } = useMeals(today)
  const { profile } = useProfile()
  const navigate = useNavigate()
  const totals = sumMacros(meals)
  const [viewingMeal, setViewingMeal] = useState(null)
  const [editingMeal, setEditingMeal] = useState(null)

  const handleDelete = async (id) => {
    await supabase.from('meals').delete().eq('id', id)
    refresh()
  }

  const dayLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 px-4 pt-12 pb-3 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Today</p>
            <p className="text-sm font-semibold text-gray-900">{dayLabel}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-2xl">
            <span className="text-sm font-bold">TODAY</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
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
            <p className="text-gray-500 text-sm">No meals logged yet</p>
            <p className="text-gray-400 text-xs mt-1">Tap + to log your first meal</p>
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

      {/* FAB */}
      <button
        onClick={() => navigate('/log')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center z-30 active:scale-95 transition-transform"
        aria-label="Log a meal"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {viewingMeal && (
        <MealDetailModal
          meal={viewingMeal}
          onClose={() => setViewingMeal(null)}
          onEdit={meal => { setViewingMeal(null); setEditingMeal(meal) }}
          onDelete={id => { handleDelete(id); setViewingMeal(null) }}
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

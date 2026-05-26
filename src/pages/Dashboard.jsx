import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { useProfile } from '../hooks/useProfile'
import { useRecentMeals } from '../hooks/useRecentMeals'
import { useToast } from '../components/Toast'
import MealCard from '../components/MealCard'
import MealDetailModal from '../components/MealDetailModal'
import EditMealModal from '../components/EditMealModal'
import NutrinoLogo from '../components/NutrinoLogo'
import EmptyState from '../components/EmptyState'
import { CaloriesCard, MacrosCard } from '../components/DayStats'
import { toLocalDateString, sumMacros, getMealMeta } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { quickLogMeal } from '../lib/meals'

const today = toLocalDateString()

export default function Dashboard() {
  const { meals, loading, error, refresh } = useMeals(today)
  const { profile } = useProfile()
  const recentMeals = useRecentMeals()
  const navigate = useNavigate()
  const toast = useToast()
  const totals = sumMacros(meals)
  const [viewingMeal, setViewingMeal] = useState(null)
  const [editingMeal, setEditingMeal] = useState(null)

  const handleDelete = async (meal) => {
    await supabase.from('meals').delete().eq('id', meal.id)
    refresh()
    toast.show('Meal deleted', {
      actionLabel: 'Undo',
      onAction: async () => {
        const { id, created_at, updated_at, ...rest } = meal
        await supabase.from('meals').insert({ ...rest, id, created_at })
        refresh()
      }
    })
  }

  const handleQuickLog = async (meal) => {
    try {
      await quickLogMeal(meal)
      refresh()
      toast.show('Added to today')
    } catch (err) {
      toast.show('Failed to add meal')
    }
  }

  const dayLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 px-4 pt-10 pb-3 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <NutrinoLogo />
            <p className="text-xs text-gray-500 mt-0.5">{dayLabel}</p>
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-red-700 flex-1">Failed to load meals</p>
            <button onClick={refresh} className="text-xs font-semibold text-red-600 underline flex-shrink-0">Retry</button>
          </div>
        )}

        {/* Quick Log strip */}
        {recentMeals.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quick Log</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
              {recentMeals.map((meal, i) => {
                const meta = getMealMeta(meal.meal_type)
                return (
                  <button
                    key={i}
                    onClick={() => handleQuickLog(meal)}
                    className="flex-shrink-0 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2 text-left active:bg-gray-100 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-800 whitespace-nowrap max-w-[140px] truncate">
                      {meta.emoji} {meal.description}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{meal.calories} kcal</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        ) : meals.length === 0 ? (
          <EmptyState icon="🍽️" title="No meals logged yet" hint="Tap + to log your first meal" />
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
          onDelete={meal => { handleDelete(meal); setViewingMeal(null) }}
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

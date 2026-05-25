import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { useProfile } from '../hooks/useProfile'
import MacroBar from '../components/MacroBar'
import MealCard from '../components/MealCard'
import EditMealModal from '../components/EditMealModal'
import { sumMacros, formatDate, toLocalDateString } from '../lib/utils'
import { supabase } from '../lib/supabase'

const today = toLocalDateString()

export default function DayDetail() {
  const { date } = useParams()
  const navigate = useNavigate()
  const { meals, loading, refresh } = useMeals(date)
  const { profile } = useProfile()
  const totals = sumMacros(meals)

  const [editingMeal, setEditingMeal] = useState(null)

  const handleDelete = async (id) => {
    await supabase.from('meals').delete().eq('id', id)
    refresh()
  }

  const handleLogAgain = (meal) => {
    navigate(`/log?type=${meal.meal_type}&desc=${encodeURIComponent(meal.description || '')}`)
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Daily Detail</p>
            <h1 className="text-base font-semibold text-gray-900">{formatDate(date)}</h1>
          </div>
        </div>

        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-3xl font-bold text-gray-900">{totals.calories}</span>
          <span className="text-base text-gray-400">/ {profile.calorie_goal} kcal</span>
        </div>

        <div className="space-y-2">
          <MacroBar label="Carbs" eaten={totals.carbs_g} goal={profile.carbs_goal_g} color="bg-blue-500" />
          <MacroBar label="Protein" eaten={totals.protein_g} goal={profile.protein_goal_g} color="bg-orange-400" />
          <MacroBar label="Fat" eaten={totals.fats_g} goal={profile.fats_goal_g} color="bg-violet-500" />
        </div>
      </div>

      {/* Scrollable meal list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
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
              <div key={meal.id}>
                <MealCard
                  meal={meal}
                  onClick={() => {}}
                  onEdit={setEditingMeal}
                  onDelete={handleDelete}
                  onLogAgain={date === today ? undefined : handleLogAgain}
                />
                {meal.items?.length > 0 && (
                  <div className="mt-1 ml-4 pl-3 border-l-2 border-gray-100">
                    {meal.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-500 py-0.5">
                        <span>{item.name}</span>
                        <span className="text-gray-400">{item.calories} kcal · {Math.round(item.carbs_g || 0)}C {Math.round(item.protein_g || 0)}P {Math.round(item.fats_g || 0)}F</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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

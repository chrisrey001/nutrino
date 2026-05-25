import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'
import { useProfile } from '../hooks/useProfile'
import MacroBar from '../components/MacroBar'
import MealCard from '../components/MealCard'
import { toLocalDateString, sumMacros, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'

const today = toLocalDateString()

export default function Dashboard() {
  const { meals, loading, refresh } = useMeals(today)
  const { profile } = useProfile()
  const navigate = useNavigate()
  const totals = sumMacros(meals)

  const handleDelete = async (id) => {
    await supabase.from('meals').delete().eq('id', id)
    refresh()
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Sticky macro header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Today</p>
        <h1 className="text-base font-semibold text-gray-900 mb-3">{formatDate(today)}</h1>

        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-3xl font-bold text-gray-900">{totals.calories}</span>
          <span className="text-base text-gray-400">/ {profile.calorie_goal} kcal</span>
        </div>

        <div className="space-y-2">
          <MacroBar label="Carbs" eaten={totals.carbs_g} goal={profile.carbs_goal_g} />
          <MacroBar label="Protein" eaten={totals.protein_g} goal={profile.protein_goal_g} />
          <MacroBar label="Fat" eaten={totals.fats_g} goal={profile.fats_goal_g} />
        </div>
      </div>

      {/* Scrollable meal list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
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
                onClick={() => navigate(`/day/${today}`)}
                onDelete={handleDelete}
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
    </div>
  )
}

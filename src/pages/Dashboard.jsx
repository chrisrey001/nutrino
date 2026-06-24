import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals, useMealsRange } from '../hooks/useMeals'
import { useProfile } from '../hooks/useProfile'
import { useFavorites } from '../hooks/useFavorites'
import MealCard from '../components/MealCard'
import MealDetailModal from '../components/MealDetailModal'
import EditMealModal from '../components/EditMealModal'
import LogActionSheet from '../components/LogActionSheet'
import NutrinoLogo from '../components/NutrinoLogo'
import { CaloriesCard, MacrosCard } from '../components/DayStats'
import { toLocalDateString, getWeekDates, sumMacros } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { IconToolsKitchen2 } from '@tabler/icons-react'

const TODAY = toLocalDateString()

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [showWeekPicker, setShowWeekPicker] = useState(false)

  const weekDates = useMemo(
    () => getWeekDates(new Date(selectedDate + 'T12:00:00')),
    [selectedDate]
  )
  const { mealsByDate } = useMealsRange(weekDates)
  const { meals, loading, refresh } = useMeals(selectedDate)
  const { profile } = useProfile()
  const navigate = useNavigate()
  const totals = sumMacros(meals)
  const [viewingMeal, setViewingMeal] = useState(null)
  const [editingMeal, setEditingMeal] = useState(null)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const { create: createFavorite } = useFavorites()

  const isToday = selectedDate === TODAY
  const dayLabel = isToday
    ? 'Today'
    : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const daySubLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  const stepDay = (delta) => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    const next = toLocalDateString(d)
    if (next <= TODAY) {
      setSelectedDate(next)
      setShowWeekPicker(false)
    }
  }

  const handleDelete = async (id) => {
    await supabase.from('meals').delete().eq('id', id)
    refresh()
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 px-4 pt-10 pb-3 border-b border-gray-100 shadow-sm relative">
        <div className="flex items-center justify-between">
          <div>
            <NutrinoLogo />
            <p className="text-xs text-gray-500 mt-0.5">{daySubLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => stepDay(-1)}
              className="w-9 h-9 flex items-center justify-center text-gray-500 rounded-xl active:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setShowWeekPicker(s => !s)}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-2xl"
            >
              <span className="text-sm font-bold">{dayLabel.toUpperCase()}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => stepDay(1)}
              disabled={isToday}
              className="w-9 h-9 flex items-center justify-center text-gray-500 rounded-xl active:bg-gray-100 transition-colors disabled:opacity-30"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Week picker */}
        {showWeekPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowWeekPicker(false)} />
            <div className="absolute left-0 right-0 top-full z-20 bg-white border-b border-gray-100 shadow-lg px-3 py-3">
              <div className="flex gap-1">
                {weekDates.map(date => {
                  const d = new Date(date + 'T12:00:00')
                  const hasMeals = (mealsByDate[date] || []).length > 0
                  const isSelected = date === selectedDate
                  const isFuture = date > TODAY
                  return (
                    <button
                      key={date}
                      onClick={() => { if (!isFuture) { setSelectedDate(date); setShowWeekPicker(false) } }}
                      disabled={isFuture}
                      className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs transition-colors ${
                        isSelected
                          ? 'bg-green-600 text-white'
                          : isFuture
                          ? 'text-gray-300'
                          : 'text-gray-600 active:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium uppercase">
                        {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                      </span>
                      <span className="text-sm font-bold mt-0.5">{d.getDate()}</span>
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        hasMeals ? (isSelected ? 'bg-white' : 'bg-green-500') : 'bg-transparent'
                      }`} />
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Scrollable content */}
      <div className="px-4 pt-4 pb-24 space-y-4">
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
            <IconToolsKitchen2 size={48} stroke={1} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No meals logged yet</p>
            <p className="text-gray-400 text-xs mt-1">{isToday ? 'Tap + to log your first meal' : 'Nothing logged this day'}</p>
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

      {/* FAB — only show on today */}
      {isToday && (
        <button
          onClick={() => setShowActionSheet(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 active:scale-95 transition-transform"
          aria-label="Log a meal"
        >
          <IconToolsKitchen2 className="w-7 h-7" stroke={2} />
        </button>
      )}

      {showActionSheet && (
        <LogActionSheet onClose={() => setShowActionSheet(false)} />
      )}

      {viewingMeal && (
        <MealDetailModal
          meal={viewingMeal}
          onClose={() => setViewingMeal(null)}
          onEdit={meal => { setViewingMeal(null); setEditingMeal(meal) }}
          onDelete={id => { handleDelete(id); setViewingMeal(null) }}
          onUpdate={refresh}
          onSaveFavorite={meal => createFavorite({
            name: meal.description || 'Unnamed meal',
            description: meal.description,
            calories: meal.calories,
            carbs_g: meal.carbs_g,
            protein_g: meal.protein_g,
            fats_g: meal.fats_g,
            items: meal.items,
          })}
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

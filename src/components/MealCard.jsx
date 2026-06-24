import { getMealMeta } from '../lib/utils'
import { getMealIcon } from '../lib/mealIcons'

export default function MealCard({ meal, onClick, onAdd, compact = false }) {
  const meta = getMealMeta(meal.meal_type)
  const displayCalories = (meal.items?.length > 0)
    ? meal.items.reduce((s, item) => s + (item.calories || 0), 0)
    : (meal.calories || 0)

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="bg-white border border-gray-200 shadow-sm rounded-2xl p-3 cursor-pointer active:bg-gray-50 transition-colors flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lg flex-shrink-0">
          {meal.image_url
            ? <img src={meal.image_url} alt="" className="w-full h-full rounded-xl object-cover" />
            : <span className="text-green-600">{getMealIcon(meal.meal_type)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 text-sm font-medium truncate">{meal.description || meta.label}</p>
          <p className="text-gray-400 text-xs mt-0.5">{meta.label}</p>
        </div>
        <span className="text-gray-700 font-bold text-sm flex-shrink-0">{displayCalories} kcal</span>
      </div>
    )
  }

  return (
    <div
      className="bg-white border border-gray-200 shadow-md rounded-3xl overflow-hidden cursor-pointer active:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
          {getMealIcon(meal.meal_type)} {meta.label}
        </span>
        <span className="text-gray-900 font-bold text-base">{displayCalories} <span className="text-gray-400 font-normal text-sm">kcal</span></span>
      </div>

      {/* Photo */}
      {meal.image_url && (
        <div className="px-3 mb-3">
          <img src={meal.image_url} alt="" className="w-full rounded-2xl object-cover max-h-52" />
        </div>
      )}

      {/* No photo + no items: icon placeholder */}
      {!meal.image_url && (!meal.items || meal.items.length === 0) && (
        <div className="mx-3 mb-3 h-20 bg-green-50 rounded-2xl flex items-center justify-center text-green-400">
          {getMealIcon(meal.meal_type, 36)}
        </div>
      )}

      {/* Items list */}
      {meal.items?.length > 0 && (
        <div className="px-4">
          {meal.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 border-b border-gray-200 last:border-0"
            >
              <span className="text-gray-800 text-sm">{item.name}</span>
              <span className="text-sm">
                <span className="text-gray-700 font-semibold">{item.calories}</span>
                <span className="text-gray-400"> kcal</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer: + Add */}
      <div className="border-t border-gray-200 mt-2 py-3 flex items-center justify-center">
        <button
          className="text-green-600 text-sm font-semibold flex items-center gap-1 px-6 py-1 active:opacity-60"
          onClick={e => { e.stopPropagation(); onAdd?.() }}
        >
          + Add
        </button>
      </div>
    </div>
  )
}

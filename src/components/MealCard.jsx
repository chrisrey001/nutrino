import { getMealMeta } from '../lib/utils'

export default function MealCard({ meal, onClick, onAdd, compact = false }) {
  const meta = getMealMeta(meal.meal_type)

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="bg-gray-900 rounded-2xl p-3 cursor-pointer active:opacity-80 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
          {meal.image_url
            ? <img src={meal.image_url} alt="" className="w-full h-full rounded-xl object-cover" />
            : meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{meal.description || meta.label}</p>
          <p className="text-gray-400 text-xs mt-0.5">{meta.label}</p>
        </div>
        <span className="text-white font-bold text-sm flex-shrink-0">{meal.calories} kcal</span>
      </div>
    )
  }

  return (
    <div
      className="bg-gray-900 rounded-3xl overflow-hidden cursor-pointer active:opacity-90 transition-opacity"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="text-white font-semibold text-base">{meta.label}</span>
        <span className="text-white font-bold text-base">{meal.calories} kcal</span>
      </div>

      {/* Photo */}
      {meal.image_url && (
        <div className="px-3 mb-3">
          <img src={meal.image_url} alt="" className="w-full rounded-2xl object-cover max-h-52" />
        </div>
      )}

      {/* No photo + no items: emoji placeholder */}
      {!meal.image_url && (!meal.items || meal.items.length === 0) && (
        <div className="mx-3 mb-3 h-20 bg-gray-800 rounded-2xl flex items-center justify-center text-3xl">
          {meta.emoji}
        </div>
      )}

      {/* Items list */}
      {meal.items?.length > 0 && (
        <div className="px-4">
          {meal.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0"
            >
              <span className="text-white text-sm">{item.name}</span>
              <span className="text-gray-400 text-sm">
                <span className="text-white font-bold">{item.calories}</span> kcal
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer: + Add */}
      <div className="border-t border-gray-800 mt-2 py-3 flex items-center justify-center">
        <button
          className="text-blue-400 text-sm font-medium flex items-center gap-1 px-6 py-1"
          onClick={e => { e.stopPropagation(); onAdd?.() }}
        >
          + Add
        </button>
      </div>
    </div>
  )
}

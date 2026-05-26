import { getMealMeta } from '../lib/utils'

export default function MealCard({ meal, onClick, onAdd, compact = false }) {
  const meta = getMealMeta(meal.meal_type)

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="bg-gray-50 border border-gray-100 rounded-2xl p-3 cursor-pointer active:bg-gray-100 transition-colors flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lg flex-shrink-0">
          {meal.image_url
            ? <img src={meal.image_url} alt="" className="w-full h-full rounded-xl object-cover" />
            : meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 text-sm font-medium truncate">{meal.description || meta.label}</p>
          <p className="text-gray-400 text-xs mt-0.5">{meta.label}</p>
        </div>
        <span className="text-gray-700 font-bold text-sm flex-shrink-0">{meal.calories} kcal</span>
      </div>
    )
  }

  return (
    <div
      className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden cursor-pointer active:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
          {meta.emoji} {meta.label}
        </span>
        <span className="text-gray-900 font-bold text-base">{meal.calories} <span className="text-gray-400 font-normal text-sm">kcal</span></span>
      </div>

      {/* Photo */}
      {meal.image_url && (
        <div className="px-3 mb-3">
          <img src={meal.image_url} alt="" className="w-full rounded-2xl object-cover max-h-52" />
        </div>
      )}

      {/* No photo + no items: emoji placeholder */}
      {!meal.image_url && (!meal.items || meal.items.length === 0) && (
        <div className="mx-3 mb-3 h-20 bg-green-50 rounded-2xl flex items-center justify-center text-3xl">
          {meta.emoji}
        </div>
      )}

      {/* Items list */}
      {meal.items?.length > 0 && (
        <div className="px-4">
          {meal.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
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
      <div className="border-t border-gray-100 mt-2 py-3 flex items-center justify-center">
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

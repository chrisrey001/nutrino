import { getMealMeta } from '../lib/utils'

export default function MealCard({ meal, onClick, onDelete, compact = false }) {
  const meta = getMealMeta(meal.meal_type)
  const time = meal.created_at
    ? new Date(meal.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : ''

  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      {meal.image_url ? (
        <img
          src={meal.image_url}
          alt={meal.description}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
          {meta.emoji}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-semibold text-green-600">{meta.label}</span>
          {time && <span className="text-xs text-gray-400">{time}</span>}
        </div>
        <p className="text-sm text-gray-800 truncate">{meal.description || 'No description'}</p>
        {!compact && (
          <p className="text-xs text-gray-500 mt-0.5">
            {meal.calories} kcal &nbsp;·&nbsp;
            {Math.round(meal.carbs_g || 0)}C &nbsp;
            {Math.round(meal.protein_g || 0)}P &nbsp;
            {Math.round(meal.fats_g || 0)}F
          </p>
        )}
      </div>

      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(meal.id) }}
          className="p-2 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
          aria-label="Delete meal"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

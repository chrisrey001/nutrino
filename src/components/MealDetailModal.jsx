import { useEffect } from 'react'
import { getMealMeta } from '../lib/utils'

function SegmentedMacroBar({ carbs, protein, fats }) {
  const carbsCal = (carbs || 0) * 4
  const protCal = (protein || 0) * 4
  const fatsCal = (fats || 0) * 9
  const total = carbsCal + protCal + fatsCal
  if (total === 0) return null

  const carbsPct = Math.round((carbsCal / total) * 100)
  const protPct = Math.round((protCal / total) * 100)
  const fatPct = 100 - carbsPct - protPct

  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-4">
        <div style={{ width: `${carbsPct}%`, background: '#3b82f6' }} className="rounded-l-full" />
        <div style={{ width: `${protPct}%`, background: '#8b5cf6' }} />
        <div style={{ width: `${fatPct}%`, background: '#f97316' }} className="rounded-r-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Carbs', pct: carbsPct, g: Math.round(carbs || 0), color: '#3b82f6' },
          { label: 'Protein', pct: protPct, g: Math.round(protein || 0), color: '#8b5cf6' },
          { label: 'Fats', pct: fatPct, g: Math.round(fats || 0), color: '#f97316' },
        ].map(({ label, pct, g, color }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="text-gray-400 text-xs">{label}</span>
            </div>
            <span className="text-white font-bold text-sm">{pct}%</span>
            <span className="text-gray-500 text-xs">{g}g</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MealDetailModal({ meal, onClose, onEdit, onDelete, onLogAgain }) {
  const meta = getMealMeta(meal.meal_type)
  const time = meal.created_at
    ? new Date(meal.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : ''

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-gray-900 rounded-t-3xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        {/* Time header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-gray-400 text-sm font-medium">Meal Time</span>
          <button
            onClick={onEdit ? () => { onClose(); onEdit(meal) } : undefined}
            className="flex items-center gap-1.5 active:opacity-70"
          >
            <span className="text-white font-semibold">{time || '—'}</span>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Photo */}
        {meal.image_url && (
          <div className="relative mx-3 mb-4">
            <img src={meal.image_url} alt="" className="w-full rounded-2xl object-cover max-h-64" />
            <div className="absolute bottom-3 right-3 bg-green-500 text-white text-sm font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span>✦</span> Replace
            </div>
          </div>
        )}

        {/* No photo: emoji */}
        {!meal.image_url && (
          <div className="mx-3 mb-4 h-28 bg-gray-800 rounded-2xl flex items-center justify-center text-4xl">
            {meta.emoji}
          </div>
        )}

        {/* Name + calories */}
        <div className="px-4 mb-4">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <p className="text-white text-xl font-semibold leading-snug flex-1">
              {meal.description || meta.label}
            </p>
            <div className="bg-gray-800 px-3 py-1.5 rounded-xl flex-shrink-0">
              <span className="text-white text-sm font-medium">× 1</span>
            </div>
          </div>
          <p className="text-gray-400 text-base">
            <span className="text-white text-2xl font-bold">{meal.calories}</span> kcal
          </p>
        </div>

        {/* Macro bar */}
        <div className="px-4 mb-5">
          <SegmentedMacroBar carbs={meal.carbs_g} protein={meal.protein_g} fats={meal.fats_g} />
        </div>

        <div className="border-t border-gray-800 mx-4 mb-4" />

        {/* Individual items */}
        {meal.items?.length > 0 && (
          <div className="px-3 space-y-2 mb-4">
            {meal.items.map((item, i) => (
              <div key={i} className="bg-gray-800 rounded-2xl p-3">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 bg-gray-700 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                    🔍
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {item.estimated_portion ? `${item.estimated_portion} · ` : ''}
                      <span className="text-white font-semibold">{item.calories}</span> kcal
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Carbs', value: `${Math.round(item.carbs_g || 0)}g` },
                    { label: 'Protein', value: `${Math.round(item.protein_g || 0)}g` },
                    { label: 'Fats', value: `${Math.round(item.fats_g || 0)}g` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-700/80 rounded-xl px-2 py-2 text-center">
                      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
                      <p className="text-white text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {(!meal.items || meal.items.length === 0) && (
          <div className="px-4 mb-4">
            <div className="bg-gray-800 rounded-2xl p-4 text-center">
              <p className="text-gray-500 text-sm">No individual items recorded</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 pb-10 space-y-2.5">
          {onEdit && (
            <button
              onClick={() => { onClose(); onEdit(meal) }}
              className="w-full h-12 bg-gray-800 text-white rounded-2xl text-sm font-semibold active:opacity-80"
            >
              Edit Entry
            </button>
          )}
          {onLogAgain && (
            <button
              onClick={() => { onClose(); onLogAgain(meal) }}
              className="w-full h-12 bg-green-600 text-white rounded-2xl text-sm font-semibold active:opacity-80"
            >
              Log Again Today
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(meal.id); onClose() }}
              className="w-full h-12 rounded-2xl text-sm font-semibold text-red-400 bg-red-500/10 active:opacity-80"
            >
              Delete Meal
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

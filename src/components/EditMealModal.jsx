import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MEAL_TYPES } from '../lib/utils'

export default function EditMealModal({ meal, onClose, onSaved }) {
  const [mealType, setMealType] = useState(meal.meal_type)
  const [description, setDescription] = useState(meal.description || '')
  const [calories, setCalories] = useState(String(meal.calories || ''))
  const [carbs, setCarbs] = useState(String(meal.carbs_g || ''))
  const [protein, setProtein] = useState(String(meal.protein_g || ''))
  const [fats, setFats] = useState(String(meal.fats_g || ''))
  const [time, setTime] = useState(() => {
    const d = new Date(meal.created_at)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const [h, m] = time.split(':').map(Number)
      const newCreatedAt = new Date(meal.created_at)
      newCreatedAt.setHours(h, m, 0, 0)

      const { error: err } = await supabase.from('meals').update({
        meal_type: mealType,
        description,
        calories: parseInt(calories) || 0,
        carbs_g: parseFloat(carbs) || 0,
        protein_g: parseFloat(protein) || 0,
        fats_g: parseFloat(fats) || 0,
        created_at: newCreatedAt.toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', meal.id)

      if (err) throw err
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-3xl px-4 pt-5 pb-10 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Edit Entry</h2>
          <button onClick={onClose} className="text-gray-400 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meal type */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Meal Type</label>
          <div className="grid grid-cols-3 gap-2">
            {MEAL_TYPES.map(m => (
              <button
                key={m.value}
                onClick={() => setMealType(m.value)}
                className={`py-2 px-2 rounded-xl text-xs font-medium transition-colors ${
                  mealType === m.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Time</label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Macros */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Nutrition</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Calories (kcal)', value: calories, set: setCalories },
              { label: 'Carbs (g)', value: carbs, set: setCarbs },
              { label: 'Protein (g)', value: protein, set: setProtein },
              { label: 'Fat (g)', value: fats, set: setFats }
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input
                  type="number"
                  value={value}
                  onChange={e => set(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

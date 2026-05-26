import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { MEAL_TYPES, sumMacros } from '../lib/utils'
import { analyzeMealText } from '../lib/gemini'
import { useModalBehavior } from '../hooks/useModalBehavior'

export default function EditMealModal({ meal, onClose, onSaved }) {
  const [mealType, setMealType] = useState(meal.meal_type)
  const [description, setDescription] = useState(meal.description || '')
  const [items, setItems] = useState(meal.items || [])
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
  const [newItemText, setNewItemText] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [addError, setAddError] = useState('')

  const sheetRef = useModalBehavior(onClose)

  const recalcFromItems = (updatedItems) => {
    const totals = sumMacros(updatedItems)
    setCalories(String(totals.calories))
    setCarbs(String(Math.round(totals.carbs_g)))
    setProtein(String(Math.round(totals.protein_g)))
    setFats(String(Math.round(totals.fats_g)))
  }

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
    recalcFromItems(updated)
  }

  const handleAddItem = async () => {
    if (!newItemText.trim()) return
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey) {
      setAddError('No Gemini API key. Add it in Settings.')
      return
    }
    setAddingItem(true)
    setAddError('')
    try {
      const result = await analyzeMealText(newItemText, apiKey)
      const newItems = result.items?.length
        ? result.items
        : [{
            name: newItemText,
            estimated_portion: '',
            calories: result.total_calories || 0,
            carbs_g: result.total_carbs_g || 0,
            protein_g: result.total_protein_g || 0,
            fats_g: result.total_fats_g || 0
          }]
      const updated = [...items, ...newItems]
      setItems(updated)
      recalcFromItems(updated)
      setNewItemText('')
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddingItem(false)
    }
  }

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
        calories: Math.max(0, parseInt(calories) || 0),
        carbs_g: Math.max(0, parseFloat(carbs) || 0),
        protein_g: Math.max(0, parseFloat(protein) || 0),
        fats_g: Math.max(0, parseFloat(fats) || 0),
        items,
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
        ref={sheetRef}
        tabIndex={-1}
        className="relative bg-white rounded-t-3xl px-4 pt-5 pb-10 space-y-4 max-h-[90vh] overflow-y-auto outline-none"
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

        {/* Items */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Items</label>
          {items.length > 0 ? (
            <div className="space-y-2 mb-3">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.calories} kcal</p>
                  </div>
                  <button
                    onClick={() => removeItem(i)}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-3">No items — add one below</p>
          )}

          {/* Add item */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={e => { setNewItemText(e.target.value); setAddError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              placeholder="e.g. 1 piece of cod"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleAddItem}
              disabled={addingItem || !newItemText.trim()}
              className="h-10 px-4 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              {addingItem ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : 'Add'}
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
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
                  min="0"
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

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MEAL_TYPES } from '../lib/utils'

function MacroInput({ label, value, onChange, unit }) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-8"
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}

export default function EditMealModal({ meal, onClose, onSaved }) {
  const [mealType, setMealType] = useState(meal.meal_type)
  const [description, setDescription] = useState(meal.description || '')
  const [calories, setCalories] = useState(String(meal.calories || ''))
  const [carbs, setCarbs] = useState(String(meal.carbs_g || ''))
  const [protein, setProtein] = useState(String(meal.protein_g || ''))
  const [fats, setFats] = useState(String(meal.fats_g || ''))
  const [editItems, setEditItems] = useState(
    (meal.items || []).map(item => ({
      ...item,
      calories: String(item.calories || ''),
      carbs_g: String(item.carbs_g || ''),
      protein_g: String(item.protein_g || ''),
      fats_g: String(item.fats_g || ''),
    }))
  )
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

  const updateItemField = (index, field, value) => {
    const updated = editItems.map((item, i) => i === index ? { ...item, [field]: value } : item)
    setEditItems(updated)
    const sum = (f) => updated.reduce((s, it) => s + (parseFloat(it[f]) || 0), 0)
    setCalories(String(Math.round(sum('calories'))))
    setCarbs(String(Math.round(sum('carbs_g') * 10) / 10))
    setProtein(String(Math.round(sum('protein_g') * 10) / 10))
    setFats(String(Math.round(sum('fats_g') * 10) / 10))
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
        calories: parseInt(calories) || 0,
        carbs_g: parseFloat(carbs) || 0,
        protein_g: parseFloat(protein) || 0,
        fats_g: parseFloat(fats) || 0,
        items: editItems.length > 0
          ? editItems.map(item => ({
              ...item,
              calories: parseInt(item.calories) || 0,
              carbs_g: parseFloat(item.carbs_g) || 0,
              protein_g: parseFloat(item.protein_g) || 0,
              fats_g: parseFloat(item.fats_g) || 0,
            }))
          : meal.items,
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
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-3xl px-4 pt-5 pb-10 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
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
              <button key={m.value} onClick={() => setMealType(m.value)}
                className={`py-2 px-2 rounded-xl text-xs font-medium transition-colors ${
                  mealType === m.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        {/* Per-item macro editing */}
        {editItems.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Items</label>
            <div className="space-y-3">
              {editItems.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <MacroInput label="Calories" value={item.calories} unit="kcal"
                      onChange={v => updateItemField(i, 'calories', v)} />
                    <MacroInput label="Carbs (g)" value={item.carbs_g} unit="g"
                      onChange={v => updateItemField(i, 'carbs_g', v)} />
                    <MacroInput label="Protein (g)" value={item.protein_g} unit="g"
                      onChange={v => updateItemField(i, 'protein_g', v)} />
                    <MacroInput label="Fat (g)" value={item.fats_g} unit="g"
                      onChange={v => updateItemField(i, 'fats_g', v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aggregate totals */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
            {editItems.length > 0 ? 'Totals (auto-calculated from items above)' : 'Nutrition'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <MacroInput label="Calories" value={calories} unit="kcal" onChange={setCalories} />
            <MacroInput label="Carbs (g)" value={carbs} unit="g" onChange={setCarbs} />
            <MacroInput label="Protein (g)" value={protein} unit="g" onChange={setProtein} />
            <MacroInput label="Fat (g)" value={fats} unit="g" onChange={setFats} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { MEAL_TYPES, HARDCODED_USER_ID } from '../lib/utils'
import { getMealIcon } from '../lib/mealIcons'

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
  const [newImageFile, setNewImageFile] = useState(null)
  const [newImagePreview, setNewImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const imageRef = useRef()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const recalcTotals = (updated) => {
    const sum = (f) => updated.reduce((s, it) => s + (parseFloat(it[f]) || 0), 0)
    setCalories(String(Math.round(sum('calories'))))
    setCarbs(String(Math.round(sum('carbs_g') * 10) / 10))
    setProtein(String(Math.round(sum('protein_g') * 10) / 10))
    setFats(String(Math.round(sum('fats_g') * 10) / 10))
  }

  const updateItemField = (index, field, value) => {
    const updated = editItems.map((item, i) => i === index ? { ...item, [field]: value } : item)
    setEditItems(updated)
    if (['calories', 'carbs_g', 'protein_g', 'fats_g'].includes(field)) {
      recalcTotals(updated)
    }
  }

  const deleteItem = (index) => {
    const updated = editItems.filter((_, i) => i !== index)
    setEditItems(updated)
    if (updated.length > 0) recalcTotals(updated)
    else { setCalories('0'); setCarbs('0'); setProtein('0'); setFats('0') }
  }

  const addItem = () => {
    setEditItems(prev => [...prev, { name: '', estimated_portion: '', calories: '', carbs_g: '', protein_g: '', fats_g: '' }])
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewImageFile(file)
    setNewImagePreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const [h, m] = time.split(':').map(Number)
      const newCreatedAt = new Date(meal.created_at)
      newCreatedAt.setHours(h, m, 0, 0)

      let image_url = meal.image_url
      if (newImageFile) {
        const ext = newImageFile.name.split('.').pop() || 'jpg'
        const date = meal.date || new Date().toISOString().split('T')[0]
        const path = `${HARDCODED_USER_ID}/${date}/${mealType}_${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('meal-photos')
          .upload(path, newImageFile, { contentType: newImageFile.type })
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('meal-photos').getPublicUrl(path)
        image_url = publicUrl
      }

      const { error: err } = await supabase.from('meals').update({
        meal_type: mealType,
        description,
        image_url,
        calories: parseInt(calories) || 0,
        carbs_g: parseFloat(carbs) || 0,
        protein_g: parseFloat(protein) || 0,
        fats_g: parseFloat(fats) || 0,
        items: editItems.map(item => ({
          ...item,
          calories: parseInt(item.calories) || 0,
          carbs_g: parseFloat(item.carbs_g) || 0,
          protein_g: parseFloat(item.protein_g) || 0,
          fats_g: parseFloat(item.fats_g) || 0,
        })),
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

  const displayPhoto = newImagePreview || meal.image_url

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

        {/* Photo */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Photo</label>
          {displayPhoto ? (
            <div className="relative">
              <img src={displayPhoto} alt="" className="w-full rounded-2xl object-cover max-h-48" />
              <button
                onClick={() => imageRef.current?.click()}
                className="absolute bottom-2 right-2 bg-white bg-opacity-90 rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 shadow"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              onClick={() => imageRef.current?.click()}
              className="w-full h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span className="text-sm font-medium">Add Photo</span>
            </button>
          )}
          <input ref={imageRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
        </div>

        {/* Meal type */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Meal Type</label>
          <div className="grid grid-cols-3 gap-2">
            {MEAL_TYPES.map(m => (
              <button key={m.value} onClick={() => setMealType(m.value)}
                className={`py-2 px-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  mealType === m.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                {getMealIcon(m.value, 13)} {m.label}
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

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Items</label>
            <button
              onClick={addItem}
              className="text-xs text-green-600 font-medium flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add item
            </button>
          </div>
          {editItems.length > 0 && (
            <div className="space-y-3">
              {editItems.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateItemField(i, 'name', e.target.value)}
                      placeholder="Item name"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    />
                    <button
                      onClick={() => deleteItem(i)}
                      className="p-2 text-red-400 active:text-red-600 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
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
          )}
        </div>

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

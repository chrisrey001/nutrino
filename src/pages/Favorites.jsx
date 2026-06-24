import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'
import { supabase } from '../lib/supabase'
import { HARDCODED_USER_ID, MEAL_TYPES, toLocalDateString } from '../lib/utils'
import { getMealIcon } from '../lib/mealIcons'
import NutrinoLogo from '../components/NutrinoLogo'
import MacroForm, { EMPTY_MACRO_FORM } from '../components/MacroForm'
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react'

export default function Favorites() {
  const navigate = useNavigate()
  const { favorites, loading, create, update, remove } = useFavorites()

  const [logId, setLogId] = useState(null)      // favorite being quick-added
  const [selectedType, setSelectedType] = useState('breakfast')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_MACRO_FORM)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_MACRO_FORM)
  const [saving, setSaving] = useState(false)

  const toggleLog = (id) => {
    setEditingId(null)
    setSelectedType('breakfast')
    setLogId(prev => prev === id ? null : id)
  }

  const handleLog = async (fav) => {
    setAdding(true)
    await supabase.from('meals').insert({
      user_id: HARDCODED_USER_ID,
      date: toLocalDateString(),
      meal_type: selectedType,
      description: fav.name,
      calories: fav.calories,
      carbs_g: fav.carbs_g,
      protein_g: fav.protein_g,
      fats_g: fav.fats_g,
      items: fav.items
    })
    setAdding(false)
    navigate('/')
  }

  const startEdit = (fav) => {
    setLogId(null)
    setEditingId(fav.id)
    setEditForm({
      name: fav.name || '',
      calories: String(fav.calories || ''),
      carbs_g: String(fav.carbs_g || ''),
      protein_g: String(fav.protein_g || ''),
      fats_g: String(fav.fats_g || ''),
    })
  }

  const handleUpdate = async () => {
    if (!editForm.name.trim()) return
    setSaving(true)
    await update(editingId, {
      name: editForm.name.trim(),
      calories: parseInt(editForm.calories) || 0,
      carbs_g: parseFloat(editForm.carbs_g) || 0,
      protein_g: parseFloat(editForm.protein_g) || 0,
      fats_g: parseFloat(editForm.fats_g) || 0,
    })
    setSaving(false)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!addForm.name.trim()) return
    setSaving(true)
    await create({
      name: addForm.name.trim(),
      calories: parseInt(addForm.calories) || 0,
      carbs_g: parseFloat(addForm.carbs_g) || 0,
      protein_g: parseFloat(addForm.protein_g) || 0,
      fats_g: parseFloat(addForm.fats_g) || 0,
    })
    setSaving(false)
    setAddForm(EMPTY_MACRO_FORM)
    setShowAdd(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-500">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <NutrinoLogo />
          <p className="text-xs text-gray-400 mt-0.5">Favorites</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-2 pb-24">
        <p className="text-xs text-gray-400 mb-1">Quick-add a saved meal to today, or manage your list.</p>

        {loading ? (
          <p className="text-sm text-gray-400 py-2">Loading…</p>
        ) : favorites.length === 0 && !showAdd ? (
          <p className="text-sm text-gray-400 py-2">No favorites yet. Save one from any meal entry, or add it manually below.</p>
        ) : (
          favorites.map(fav => (
            <div key={fav.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-3 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-sm font-medium text-gray-900 break-words">{fav.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fav.calories} kcal · {Math.round(fav.protein_g)}g P · {Math.round(fav.carbs_g)}g C · {Math.round(fav.fats_g)}g F
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => editingId === fav.id ? setEditingId(null) : startEdit(fav)}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
                    aria-label="Edit favorite"
                  >
                    <IconPencil size={16} stroke={1.8} />
                  </button>
                  <button
                    onClick={() => remove(fav.id)}
                    className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center"
                    aria-label="Delete favorite"
                  >
                    <IconTrash size={16} stroke={1.8} />
                  </button>
                  <button
                    onClick={() => toggleLog(fav.id)}
                    className="h-8 px-3 rounded-full bg-green-600 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <IconPlus size={14} stroke={2} /> Log
                  </button>
                </div>
              </div>

              {logId === fav.id && (
                <div className="mt-3 space-y-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">Add as:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {MEAL_TYPES.map(m => (
                      <button
                        key={m.value}
                        onClick={() => setSelectedType(m.value)}
                        className={`py-1.5 px-1 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          selectedType === m.value ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        {getMealIcon(m.value, 13)} {m.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleLog(fav)}
                    disabled={adding}
                    className="w-full h-10 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
                  >
                    {adding ? 'Adding…' : 'Log it'}
                  </button>
                </div>
              )}

              {editingId === fav.id && (
                <MacroForm
                  form={editForm}
                  onChange={setEditForm}
                  onSave={handleUpdate}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              )}
            </div>
          ))
        )}

        {showAdd ? (
          <div className="bg-white rounded-2xl border border-green-200 shadow-sm px-3 py-3">
            <p className="text-sm font-medium text-gray-700">New Favorite</p>
            <MacroForm
              form={addForm}
              onChange={setAddForm}
              onSave={handleCreate}
              onCancel={() => { setShowAdd(false); setAddForm(EMPTY_MACRO_FORM) }}
              saving={saving}
            />
          </div>
        ) : (
          <button
            onClick={() => { setEditingId(null); setLogId(null); setShowAdd(true) }}
            className="w-full flex items-center justify-center gap-1 text-sm text-green-600 font-medium py-3"
          >
            <IconPlus size={16} stroke={2} /> Add manually
          </button>
        )}
      </div>
    </div>
  )
}

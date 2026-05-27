import { useState } from 'react'
import { useFavorites } from '../hooks/useFavorites'

const EMPTY_FORM = { name: '', calories: '', carbs_g: '', protein_g: '', fats_g: '' }

function MacroForm({ form, onChange, onSave, onCancel, saving }) {
  return (
    <div className="mt-3 space-y-3 pt-3 border-t border-gray-100">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Protein Shake"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'calories', label: 'Calories (kcal)' },
          { key: 'carbs_g', label: 'Carbs (g)' },
          { key: 'protein_g', label: 'Protein (g)' },
          { key: 'fats_g', label: 'Fat (g)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-gray-500 block mb-1">{label}</label>
            <input
              type="number"
              value={form[key]}
              onChange={e => onChange({ ...form, [key]: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!form.name.trim() || saving}
          className="flex-1 h-9 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 h-9 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function FavoritesManager() {
  const { favorites, loading, create, update, remove } = useFavorites()
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const startEdit = (fav) => {
    setShowAdd(false)
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
    setAddForm(EMPTY_FORM)
    setShowAdd(false)
  }

  if (loading) return <p className="text-sm text-gray-400 py-2">Loading…</p>

  return (
    <div className="space-y-1">
      {favorites.length === 0 && !showAdd && (
        <p className="text-sm text-gray-400 py-1">No favorites saved yet.</p>
      )}

      {favorites.map(fav => (
        <div key={fav.id} className="rounded-xl border border-gray-100 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-medium text-gray-900 truncate">{fav.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{fav.calories} kcal</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => editingId === fav.id ? setEditingId(null) : startEdit(fav)}
                className="text-xs text-green-600 font-medium px-2 py-1 rounded-lg bg-green-50"
              >
                {editingId === fav.id ? 'Close' : 'Edit'}
              </button>
              <button
                onClick={() => remove(fav.id)}
                className="text-xs text-red-500 font-medium px-2 py-1 rounded-lg bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>

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
      ))}

      {showAdd && (
        <div className="rounded-xl border border-green-100 bg-green-50/30 px-3 py-2.5">
          <p className="text-sm font-medium text-gray-700 mb-0.5">New Favorite</p>
          <MacroForm
            form={addForm}
            onChange={setAddForm}
            onSave={handleCreate}
            onCancel={() => { setShowAdd(false); setAddForm(EMPTY_FORM) }}
            saving={saving}
          />
        </div>
      )}

      {!showAdd && (
        <button
          onClick={() => { setEditingId(null); setShowAdd(true) }}
          className="w-full text-sm text-green-600 font-medium py-2 text-left"
        >
          + Add manually
        </button>
      )}
    </div>
  )
}

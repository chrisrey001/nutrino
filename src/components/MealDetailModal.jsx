import { useEffect, useRef, useState } from 'react'
import { getMealMeta } from '../lib/utils'
import { supabase } from '../lib/supabase'

const DISMISS_THRESHOLD = 140
const VELOCITY_THRESHOLD = 0.5

function recalcTotals(items) {
  return {
    calories: items.reduce((s, it) => s + (it.calories || 0), 0),
    carbs_g: items.reduce((s, it) => s + (it.carbs_g || 0), 0),
    protein_g: items.reduce((s, it) => s + (it.protein_g || 0), 0),
    fats_g: items.reduce((s, it) => s + (it.fats_g || 0), 0),
  }
}

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
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
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
              <span className="text-gray-500 text-xs">{label}</span>
            </div>
            <span className="text-gray-900 font-bold text-sm">{pct}%</span>
            <span className="text-gray-400 text-xs">{g}g</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SaveFavoriteButton({ meal, onSave }) {
  const [saved, setSaved] = useState(false)
  const handle = async () => { await onSave(meal); setSaved(true) }
  return (
    <button onClick={handle} disabled={saved}
      className="w-full h-12 bg-gray-100 text-gray-800 rounded-2xl text-sm font-semibold active:bg-gray-200 transition-colors disabled:text-gray-400">
      {saved ? '⭐ Saved to Favorites!' : '⭐ Save as Favorite'}
    </button>
  )
}

function ItemField({ label, value, onChange, unit, type = 'number' }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}

export default function MealDetailModal({ meal, onClose, onEdit, onDelete, onLogAgain, onSaveFavorite, onUpdate }) {
  const [mealData, setMealData] = useState(meal)
  const [view, setView] = useState('detail')
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)

  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const startTime = useRef(0)

  const meta = getMealMeta(mealData.meal_type)
  const time = mealData.created_at
    ? new Date(mealData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : ''

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const onDragStart = (e) => { startY.current = e.touches[0].clientY; startTime.current = Date.now(); setIsDragging(true) }
  const onDragMove = (e) => { const d = e.touches[0].clientY - startY.current; if (d > 0) setTranslateY(d) }
  const onDragEnd = () => {
    setIsDragging(false)
    const velocity = translateY / Math.max(1, Date.now() - startTime.current)
    if (translateY > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) onClose()
    else setTranslateY(0)
  }

  const handleEditItem = (index) => {
    const item = mealData.items[index]
    setEditingItem({
      index,
      name: item.name || '',
      estimated_portion: item.estimated_portion || '',
      calories: String(item.calories || ''),
      carbs_g: String(item.carbs_g || ''),
      protein_g: String(item.protein_g || ''),
      fats_g: String(item.fats_g || ''),
    })
    setView('edit-item')
  }

  const handleSaveItem = async () => {
    setSaving(true)
    const updatedItems = mealData.items.map((item, i) =>
      i === editingItem.index ? {
        ...item,
        name: editingItem.name,
        estimated_portion: editingItem.estimated_portion,
        calories: parseInt(editingItem.calories) || 0,
        carbs_g: parseFloat(editingItem.carbs_g) || 0,
        protein_g: parseFloat(editingItem.protein_g) || 0,
        fats_g: parseFloat(editingItem.fats_g) || 0,
      } : item
    )
    const totals = recalcTotals(updatedItems)
    const { error } = await supabase.from('meals').update({ items: updatedItems, ...totals }).eq('id', mealData.id)
    if (!error) { setMealData({ ...mealData, items: updatedItems, ...totals }); onUpdate?.(); setView('detail') }
    setSaving(false)
  }

  const handleDeleteItem = async (index) => {
    const updatedItems = mealData.items.filter((_, i) => i !== index)
    const totals = recalcTotals(updatedItems)
    await supabase.from('meals').update({ items: updatedItems, ...totals }).eq('id', mealData.id)
    setMealData({ ...mealData, items: updatedItems, ...totals })
    onUpdate?.()
  }

  const handleBackdropClick = () => { if (view === 'detail') onClose(); else setView('detail') }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={handleBackdropClick}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {view === 'edit-item' ? (
          /* ── Item edit view ── */
          <div className="px-4 pt-4 pb-10 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setView('detail')} className="p-1 -ml-1 text-gray-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-base font-semibold text-gray-900">Edit Item</h2>
            </div>

            <ItemField label="Name" value={editingItem.name} type="text"
              onChange={v => setEditingItem(e => ({ ...e, name: v }))} />
            <ItemField label="Portion" value={editingItem.estimated_portion} type="text"
              onChange={v => setEditingItem(e => ({ ...e, estimated_portion: v }))} />

            <div className="grid grid-cols-2 gap-3">
              <ItemField label="Calories" value={editingItem.calories} unit="kcal"
                onChange={v => setEditingItem(e => ({ ...e, calories: v }))} />
              <ItemField label="Carbs" value={editingItem.carbs_g} unit="g"
                onChange={v => setEditingItem(e => ({ ...e, carbs_g: v }))} />
              <ItemField label="Protein" value={editingItem.protein_g} unit="g"
                onChange={v => setEditingItem(e => ({ ...e, protein_g: v }))} />
              <ItemField label="Fats" value={editingItem.fats_g} unit="g"
                onChange={v => setEditingItem(e => ({ ...e, fats_g: v }))} />
            </div>

            <button onClick={handleSaveItem} disabled={saving}
              className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        ) : (
          /* ── Detail view ── */
          <>
            <div className="touch-none select-none" onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-gray-500 text-sm font-medium">Meal Time</span>
                <button onClick={onEdit ? () => { onClose(); onEdit(mealData) } : undefined}
                  className="flex items-center gap-1.5 active:opacity-60">
                  <span className="text-gray-900 font-semibold">{time || '—'}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                  </svg>
                </button>
              </div>
            </div>

            {mealData.image_url ? (
              <div className="mx-3 mb-4">
                <img src={mealData.image_url} alt="" className="w-full rounded-2xl object-cover max-h-64" />
              </div>
            ) : (
              <div className="mx-3 mb-4 h-28 bg-green-50 rounded-2xl flex items-center justify-center text-4xl">
                {meta.emoji}
              </div>
            )}

            <div className="px-4 mb-4">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <p className="text-gray-900 text-xl font-semibold leading-snug flex-1">
                  {mealData.description || meta.label}
                </p>
                <div className="bg-gray-100 px-3 py-1.5 rounded-xl flex-shrink-0">
                  <span className="text-gray-600 text-sm font-medium">× 1</span>
                </div>
              </div>
              <p className="text-gray-500 text-base">
                <span className="text-green-600 text-2xl font-bold">{mealData.calories}</span> kcal
              </p>
            </div>

            <div className="px-4 mb-5">
              <SegmentedMacroBar carbs={mealData.carbs_g} protein={mealData.protein_g} fats={mealData.fats_g} />
            </div>

            <div className="border-t border-gray-100 mx-4 mb-4" />

            {mealData.items?.length > 0 && (
              <div className="px-3 space-y-2 mb-4">
                {mealData.items.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-3">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-base flex-shrink-0 shadow-sm">
                        🔍
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm font-medium truncate">{item.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {item.estimated_portion ? `${item.estimated_portion} · ` : ''}
                          <span className="text-gray-800 font-semibold">{item.calories}</span> kcal
                        </p>
                      </div>
                      <button onClick={() => handleEditItem(i)} className="p-1.5 text-gray-400 active:text-gray-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteItem(i)} className="p-1.5 text-red-400 active:text-red-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Carbs', value: `${Math.round(item.carbs_g || 0)}g`, color: '#3b82f6' },
                        { label: 'Protein', value: `${Math.round(item.protein_g || 0)}g`, color: '#8b5cf6' },
                        { label: 'Fats', value: `${Math.round(item.fats_g || 0)}g`, color: '#f97316' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white border border-gray-100 rounded-xl px-2 py-2 text-center">
                          <p className="text-xs mb-0.5 font-medium" style={{ color }}>{label}</p>
                          <p className="text-gray-800 text-sm font-semibold">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(!mealData.items || mealData.items.length === 0) && (
              <div className="px-4 mb-4">
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-gray-400 text-sm">No individual items recorded</p>
                </div>
              </div>
            )}

            <div className="px-4 pb-10 space-y-2.5">
              {onEdit && (
                <button onClick={() => { onClose(); onEdit(mealData) }}
                  className="w-full h-12 bg-gray-100 text-gray-800 rounded-2xl text-sm font-semibold active:bg-gray-200 transition-colors">
                  Edit Entry
                </button>
              )}
              {onSaveFavorite && <SaveFavoriteButton meal={mealData} onSave={onSaveFavorite} />}
              {onLogAgain && (
                <button onClick={() => { onClose(); onLogAgain(mealData) }}
                  className="w-full h-12 bg-green-600 text-white rounded-2xl text-sm font-semibold active:opacity-80">
                  Log Again Today
                </button>
              )}
              {onDelete && (
                <button onClick={() => { onDelete(mealData.id); onClose() }}
                  className="w-full h-12 rounded-2xl text-sm font-semibold text-red-500 bg-red-50 active:bg-red-100 transition-colors">
                  Delete Meal
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'
import { supabase } from '../lib/supabase'
import { HARDCODED_USER_ID, MEAL_TYPES, toLocalDateString } from '../lib/utils'

const DISMISS_THRESHOLD = 140
const VELOCITY_THRESHOLD = 0.5

export default function LogActionSheet({ onClose, onMealAdded }) {
  const navigate = useNavigate()
  const [view, setView] = useState('options')
  const [expandedId, setExpandedId] = useState(null)
  const [selectedType, setSelectedType] = useState('breakfast')
  const [adding, setAdding] = useState(false)
  const { favorites, loading } = useFavorites()

  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const lastY = useRef(0)
  const lastTime = useRef(0)

  const onDragStart = (e) => {
    startY.current = e.touches[0].clientY
    lastY.current = e.touches[0].clientY
    lastTime.current = Date.now()
    setIsDragging(true)
  }
  const onDragMove = (e) => {
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      lastY.current = e.touches[0].clientY
      lastTime.current = Date.now()
      setTranslateY(delta)
    }
  }
  const onDragEnd = () => {
    setIsDragging(false)
    const elapsed = Math.max(16, Date.now() - lastTime.current)
    const velocity = (lastY.current - startY.current) / elapsed
    if (translateY > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) onClose()
    else setTranslateY(0)
  }

  const handleToggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id)
    setSelectedType('breakfast')
  }

  const handleLogFavorite = async (fav) => {
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
    onMealAdded?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-t-3xl"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="touch-none select-none px-4 pt-3 pb-4"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          {view === 'options' ? (
            <p className="text-base font-semibold text-gray-900">Log Your Meal</p>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onTouchEnd={e => e.stopPropagation()}
                onClick={() => setView('options')}
                className="p-1 -ml-1 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <p className="text-base font-semibold text-gray-900">Favorites</p>
            </div>
          )}
        </div>

        {view === 'options' ? (
          <div className="px-4 pb-10">
            <div className="space-y-2">
              <OptionButton
                icon="📸"
                title="Take a Photo"
                sub="AI analyzes your meal"
                onClick={() => { onClose(); navigate('/log?mode=photo') }}
              />
              <OptionButton
                icon="✏️"
                title="Describe Your Meal"
                sub="Type what you ate"
                onClick={() => { onClose(); navigate('/log?mode=text') }}
              />
              <OptionButton
                icon="⭐"
                title="Favorites"
                sub="Quick-add a saved meal"
                onClick={() => setView('favorites')}
              />
            </div>
          </div>
        ) : (
          <div className="pb-10">
            {loading ? (
              <p className="text-center py-8 text-gray-400 text-sm">Loading…</p>
            ) : favorites.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-gray-500 text-sm">No favorites yet.</p>
                <p className="text-gray-400 text-xs mt-1">Log a meal and tap "Save as Favorite" to add one.</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[60vh]">
                {favorites.map(fav => (
                  <div key={fav.id} className="border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-gray-900 text-sm font-medium truncate">{fav.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {fav.calories} kcal · {Math.round(fav.protein_g)}g P · {Math.round(fav.carbs_g)}g C · {Math.round(fav.fats_g)}g F
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleExpand(fav.id)}
                        className="w-8 h-8 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0"
                      >
                        {expandedId === fav.id ? '−' : '+'}
                      </button>
                    </div>

                    {expandedId === fav.id && (
                      <div className="px-4 pb-4 space-y-3 bg-gray-50">
                        <p className="text-xs text-gray-500 font-medium pt-2">Add as:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {MEAL_TYPES.map(m => (
                            <button
                              key={m.value}
                              onClick={() => setSelectedType(m.value)}
                              className={`py-1.5 px-1 rounded-xl text-xs font-medium transition-colors ${
                                selectedType === m.value
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white text-gray-600 border border-gray-200'
                              }`}
                            >
                              {m.emoji} {m.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleLogFavorite(fav)}
                          disabled={adding}
                          className="w-full h-10 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
                        >
                          {adding ? 'Adding…' : 'Log it'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function OptionButton({ icon, title, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-4 active:bg-gray-100 transition-colors text-left"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-gray-900 text-sm font-semibold">{title}</p>
        <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
      </div>
    </button>
  )
}

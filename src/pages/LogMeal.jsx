import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { analyzeMeal, analyzeMealText } from '../lib/gemini'
import { useFavorites } from '../hooks/useFavorites'
import { supabase } from '../lib/supabase'
import NutrinoLogo from '../components/NutrinoLogo'
import { HARDCODED_USER_ID, MEAL_TYPES, toLocalDateString } from '../lib/utils'
import { getMealIcon } from '../lib/mealIcons'
import { IconSparkles, IconChartPie, IconStar, IconStarFilled } from '@tabler/icons-react'

const today = toLocalDateString()

export default function LogMeal() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fileRef = useRef()
  const mode = params.get('mode') // 'photo' | 'text' | null

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [mealType, setMealType] = useState(params.get('type') || 'breakfast')
  const [textInput, setTextInput] = useState(params.get('desc') || '')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedFav, setSavedFav] = useState(false)

  const [result, setResult] = useState(null)
  const [description, setDescription] = useState('')
  const [items, setItems] = useState([])
  const [calories, setCalories] = useState('')
  const [carbs, setCarbs] = useState('')
  const [protein, setProtein] = useState('')
  const [fats, setFats] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [draftItem, setDraftItem] = useState(null)

  const { create: createFavorite } = useFavorites()

  const recalcTotalsFromItems = (updated) => {
    const cal = updated.reduce((s, it) => s + (parseFloat(it.calories) || 0), 0)
    const c = updated.reduce((s, it) => s + (parseFloat(it.carbs_g) || 0), 0)
    const p = updated.reduce((s, it) => s + (parseFloat(it.protein_g) || 0), 0)
    const f = updated.reduce((s, it) => s + (parseFloat(it.fats_g) || 0), 0)
    setCalories(String(Math.round(cal)))
    setCarbs(String(Math.round(c * 10) / 10))
    setProtein(String(Math.round(p * 10) / 10))
    setFats(String(Math.round(f * 10) / 10))
  }

  const applyResult = (data, fallbackDescription = '') => {
    setResult(data)
    setDescription(data.description || fallbackDescription)
    const dataItems = data.items || []
    setItems(dataItems)
    setEditingIndex(null)
    setDraftItem(null)
    const computedCal = dataItems.length > 0
      ? dataItems.reduce((s, i) => s + (i.calories || 0), 0)
      : (data.total_calories || 0)
    setCalories(String(computedCal))
    setCarbs(String(data.total_carbs_g || ''))
    setProtein(String(data.total_protein_g || ''))
    setFats(String(data.total_fats_g || ''))
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setResult(null)
    setError('')
    setSavedFav(false)
  }

  const runAnalysis = async (text) => {
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey) { setError('No Gemini API key found. Go to Settings and add your key.'); return }
    setAnalyzing(true)
    setError('')
    try {
      if (imageFile) {
        const data = await analyzeMeal(imageFile, apiKey, textInput.trim() || null, mealType)
        applyResult(data)
      } else {
        const data = await analyzeMealText(text, apiKey, mealType)
        const textItems = data.items || []
        setItems(textItems)
        setEditingIndex(null)
        setDraftItem(null)
        const computedCal = textItems.length > 0
          ? textItems.reduce((s, i) => s + (i.calories || 0), 0)
          : (data.total_calories || 0)
        setCalories(String(computedCal))
        setCarbs(String(data.total_carbs_g || ''))
        setProtein(String(data.total_protein_g || ''))
        setFats(String(data.total_fats_g || ''))
        if (!result) { setDescription(data.description || text); setResult(data) }
        else setResult(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleAnalyze = () => runAnalysis(textInput)
  const handleAnalyzeDescription = () => runAnalysis(description)

  const handleDeletePreSaveItem = (index) => {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
    if (updated.length > 0) recalcTotalsFromItems(updated)
    if (editingIndex === index) {
      setEditingIndex(null)
      setDraftItem(null)
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1)
    }
  }

  const handleEditPreSaveItemStart = (index) => {
    const item = items[index]
    setDraftItem({
      name: item.name || '',
      estimated_portion: item.estimated_portion || '',
      calories: String(item.calories || ''),
      carbs_g: String(item.carbs_g || ''),
      protein_g: String(item.protein_g || ''),
      fats_g: String(item.fats_g || ''),
    })
    setEditingIndex(index)
  }

  const handleSaveDraftItem = () => {
    const updated = items.map((item, i) =>
      i === editingIndex ? {
        ...item,
        name: draftItem.name,
        estimated_portion: draftItem.estimated_portion,
        calories: parseInt(draftItem.calories) || 0,
        carbs_g: parseFloat(draftItem.carbs_g) || 0,
        protein_g: parseFloat(draftItem.protein_g) || 0,
        fats_g: parseFloat(draftItem.fats_g) || 0,
      } : item
    )
    setItems(updated)
    recalcTotalsFromItems(updated)
    setEditingIndex(null)
    setDraftItem(null)
  }

  const handleAddItem = () => {
    const newItem = { name: '', estimated_portion: '', calories: 0, carbs_g: 0, protein_g: 0, fats_g: 0 }
    const updated = [...items, newItem]
    setItems(updated)
    setDraftItem({ name: '', estimated_portion: '', calories: '', carbs_g: '', protein_g: '', fats_g: '' })
    setEditingIndex(updated.length - 1)
  }

  const handleSave = async () => {
    if (!calories) { setError('Please analyze or enter calories before saving.'); return }
    setSaving(true)
    setError('')
    try {
      let image_url = null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'jpg'
        const path = `${HARDCODED_USER_ID}/${today}/${mealType}_${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('meal-photos')
          .upload(path, imageFile, { contentType: imageFile.type })
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('meal-photos').getPublicUrl(path)
        image_url = publicUrl
      }
      const { error: insertErr } = await supabase.from('meals').insert({
        user_id: HARDCODED_USER_ID,
        date: today,
        meal_type: mealType,
        description,
        image_url,
        calories: parseInt(calories) || 0,
        carbs_g: parseFloat(carbs) || 0,
        protein_g: parseFloat(protein) || 0,
        fats_g: parseFloat(fats) || 0,
        items,
        ai_raw_response: result
      })
      if (insertErr) throw insertErr
      navigate('/')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const handleSaveFavorite = async () => {
    await createFavorite({
      name: description || 'Unnamed meal',
      description,
      calories: parseInt(calories) || 0,
      carbs_g: parseFloat(carbs) || 0,
      protein_g: parseFloat(protein) || 0,
      fats_g: parseFloat(fats) || 0,
      items,
    })
    setSavedFav(true)
  }

  const showCamera = mode !== 'text'
  const showInitialText = !result && (mode !== 'photo' || imagePreview)
  const canAnalyze = !result && (
    mode === 'photo' ? !!imagePreview :
    mode === 'text' ? textInput.trim().length > 0 :
    (!!imagePreview || textInput.trim().length > 0)
  )

  const modeLabel = mode === 'photo' ? 'Take a Photo' : mode === 'text' ? 'Describe a Meal' : null

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
          {modeLabel && <p className="text-xs text-gray-400 mt-0.5">{modeLabel}</p>}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Meal type */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Meal Type</label>
          <div className="grid grid-cols-3 gap-2">
            {MEAL_TYPES.map(m => (
              <button
                key={m.value}
                onClick={() => setMealType(m.value)}
                className={`py-2 px-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  mealType === m.value ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {getMealIcon(m.value, 13)} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Camera */}
        {showCamera && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Photo</label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Meal" className="w-full rounded-2xl object-cover max-h-64" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-white bg-opacity-90 rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 shadow"
                >
                  Retake
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-44 bg-white border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400"
              >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-sm font-medium">Take a photo</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          </div>
        )}

        {/* Text input — details to sharpen the photo estimate, or primary input for text mode */}
        {showInitialText && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              {imagePreview ? 'Add details to sharpen the estimate (optional)' : 'Describe your meal'}
            </label>
            <p className="text-xs text-gray-400 mb-2">
              {imagePreview
                ? "Sent to the AI along with your photo. Mention portions or ingredients the camera can't judge for a more accurate estimate."
                : 'The AI estimates calories and macros from your description.'}
            </p>
            <textarea
              value={textInput}
              onChange={e => { setTextInput(e.target.value); setError('') }}
              placeholder={imagePreview
                ? 'e.g. about ½ a chicken breast · cooked in 1 tbsp oil · no dressing'
                : 'e.g. 2 scrambled eggs, whole wheat toast, black coffee'}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>
        )}

        {/* Analyze button */}
        {canAnalyze && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analyzing…
              </>
            ) : <><IconSparkles size={16} stroke={1.5} /> Analyze with AI</>}
          </button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Results editor */}
        {result && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-1.5"><IconChartPie size={16} stroke={1.5} className="text-gray-500" /> Nutrition Details</h2>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => { setDescription(e.target.value); if (error) setError('') }}
                placeholder="e.g. zucchini bread, 1 slice"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {!imageFile && description.trim() && (
                <button
                  onClick={handleAnalyzeDescription}
                  disabled={analyzing}
                  className="mt-2 w-full h-10 bg-green-600 text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Estimating…
                    </>
                  ) : <><IconSparkles size={14} stroke={1.5} /> Estimate macros with AI</>}
                </button>
              )}
            </div>

            {/* Items — editable before save */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500">Items</label>
                {editingIndex === null && (
                  <button
                    onClick={handleAddItem}
                    className="text-xs text-green-600 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add item
                  </button>
                )}
              </div>

              {items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((item, i) =>
                    editingIndex === i ? (
                      <div key={i} className="bg-gray-50 rounded-2xl p-3 space-y-2 border border-green-200">
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Name</label>
                            <input
                              type="text"
                              value={draftItem.name}
                              onChange={e => setDraftItem(d => ({ ...d, name: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Portion</label>
                            <input
                              type="text"
                              value={draftItem.estimated_portion}
                              onChange={e => setDraftItem(d => ({ ...d, estimated_portion: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Calories (kcal)', field: 'calories' },
                            { label: 'Carbs (g)', field: 'carbs_g' },
                            { label: 'Protein (g)', field: 'protein_g' },
                            { label: 'Fat (g)', field: 'fats_g' },
                          ].map(({ label, field }) => (
                            <div key={field}>
                              <label className="text-xs text-gray-400 block mb-1">{label}</label>
                              <input
                                type="number"
                                value={draftItem[field]}
                                onChange={e => setDraftItem(d => ({ ...d, [field]: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveDraftItem}
                            className="flex-1 h-9 bg-green-600 text-white rounded-xl text-xs font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              // Remove item if it was newly added blank
                              if (!items[editingIndex]?.name && !items[editingIndex]?.calories) {
                                const updated = items.filter((_, idx) => idx !== editingIndex)
                                setItems(updated)
                              }
                              setEditingIndex(null)
                              setDraftItem(null)
                            }}
                            className="flex-1 h-9 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex items-center text-sm py-1.5 border-b border-gray-100 last:border-0">
                        <span className="text-gray-700 flex-1 truncate">{item.name || 'Unnamed item'}</span>
                        <span className="text-gray-500 text-xs ml-2 flex-shrink-0">{item.calories} kcal</span>
                        <button
                          onClick={() => handleEditPreSaveItemStart(i)}
                          className="ml-2 p-1 text-gray-400 active:text-gray-600 flex-shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePreSaveItem(i)}
                          className="ml-1 p-1 text-red-400 active:text-red-600 flex-shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No items — tap "Add item" to add one manually.</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Totals (editable)</label>
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

            {result.notes && (
              <p className="text-xs text-gray-400 italic">{result.notes}</p>
            )}

            <button
              onClick={handleSaveFavorite}
              disabled={savedFav}
              className="w-full text-sm font-medium py-1.5 text-green-600 disabled:text-gray-400 transition-colors"
            >
              {savedFav ? <><IconStarFilled size={14} className="text-yellow-500" /> Saved to favorites!</> : <><IconStar size={14} /> Save as Favorite</>}
            </button>
          </div>
        )}

        {/* Manual entry fallback */}
        {!result && !imagePreview && !textInput.trim() && mode !== 'photo' && mode !== 'text' && (
          <button
            onClick={() => setResult({ items: [] })}
            className="w-full text-sm text-gray-400 underline text-center"
          >
            Enter manually without AI
          </button>
        )}

        {result && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Meal'}
          </button>
        )}
      </div>
    </div>
  )
}

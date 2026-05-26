import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { analyzeMeal, analyzeMealText } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import NutrinoLogo from '../components/NutrinoLogo'
import { HARDCODED_USER_ID, MEAL_TYPES, toLocalDateString } from '../lib/utils'

const today = toLocalDateString()

export default function LogMeal() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fileRef = useRef()

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [mealType, setMealType] = useState(params.get('type') || 'breakfast')
  const [textInput, setTextInput] = useState(params.get('desc') || '')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [result, setResult] = useState(null)
  const [description, setDescription] = useState('')
  const [items, setItems] = useState([])
  const [calories, setCalories] = useState('')
  const [carbs, setCarbs] = useState('')
  const [protein, setProtein] = useState('')
  const [fats, setFats] = useState('')

  const applyResult = (data, fallbackDescription = '') => {
    setResult(data)
    setDescription(data.description || fallbackDescription)
    setItems(data.items || [])
    setCalories(String(data.total_calories || ''))
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
  }

  const runAnalysis = async (text) => {
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey) {
      setError('No Gemini API key found. Go to Settings and add your key.')
      return
    }
    setAnalyzing(true)
    setError('')
    try {
      if (imageFile) {
        const data = await analyzeMeal(imageFile, apiKey)
        applyResult(data)
      } else {
        const data = await analyzeMealText(text, apiKey)
        // only update macros/items if called from inside the editor (description already set)
        setItems(data.items || [])
        setCalories(String(data.total_calories || ''))
        setCarbs(String(data.total_carbs_g || ''))
        setProtein(String(data.total_protein_g || ''))
        setFats(String(data.total_fats_g || ''))
        if (!result) {
          setDescription(data.description || text)
          setResult(data)
        } else {
          setResult(data)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleAnalyze = () => runAnalysis(textInput)
  const handleAnalyzeDescription = () => runAnalysis(description)

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

  const canAnalyze = (imagePreview || textInput.trim().length > 0) && !result

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-500">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <NutrinoLogo />
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
                className={`py-2 px-2 rounded-xl text-xs font-medium transition-colors ${
                  mealType === m.value
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Photo */}
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

        {/* Text input */}
        {!result && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
              {imagePreview ? 'Add context (optional)' : 'Describe your meal'}
            </label>
            <textarea
              value={textInput}
              onChange={e => { setTextInput(e.target.value); setError('') }}
              placeholder={imagePreview
                ? 'e.g. large portion, added extra cheese…'
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
            ) : '✨ Analyze with AI'}
          </button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Results editor */}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">Nutrition Details</h2>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => { setDescription(e.target.value); setError('') }}
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
                  ) : '✨ Estimate macros with AI'}
                </button>
              )}
            </div>

            {items.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-2">Items</label>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-gray-700 flex-1">{item.name}</span>
                      <span className="text-gray-500 text-xs ml-2">{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
          </div>
        )}

        {/* Manual entry fallback — only when no photo and no text */}
        {!result && !imagePreview && !textInput.trim() && (
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

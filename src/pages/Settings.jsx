import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import NutrinoLogo from '../components/NutrinoLogo'
import { IconUser, IconTarget, IconStar, IconKey, IconChevronRight } from '@tabler/icons-react'

export default function Settings() {
  const navigate = useNavigate()
  const { profile, loading, save } = useProfile()
  const [form, setForm] = useState(profile)
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => { setForm(profile) }, [profile])
  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key') || ''
    setApiKey(key)
  }, [])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    localStorage.setItem('gemini_api_key', apiKey)
    await save({
      name: form.name,
      calorie_goal: parseInt(form.calorie_goal) || 2100,
      carbs_goal_g: parseInt(form.carbs_goal_g) || 131,
      protein_goal_g: parseInt(form.protein_goal_g) || 236,
      fats_goal_g: parseInt(form.fats_goal_g) || 70,
      dietician_name: form.dietician_name
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Loading…</div>

  return (
    <div className="min-h-full bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white sticky top-0 z-10 px-4 pt-10 pb-3 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <NutrinoLogo />
          <span className="text-sm font-semibold text-gray-500">Settings</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 max-w-md mx-auto space-y-6">
        {/* Profile */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><IconUser size={15} stroke={1.5} />Profile</h2>
          <Field label="Your Name" value={form.name || ''} onChange={set('name')} placeholder="e.g. Chris" />
          <Field label="Dietician Name" value={form.dietician_name || ''} onChange={set('dietician_name')} placeholder="Appears on PDF reports" />
        </section>

        {/* Goals */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><IconTarget size={15} stroke={1.5} />Daily Goals</h2>
          <Field label="Calories (kcal)" value={form.calorie_goal} onChange={set('calorie_goal')} type="number" />
          <Field label="Carbs (g)" value={form.carbs_goal_g} onChange={set('carbs_goal_g')} type="number" />
          <Field label="Protein (g)" value={form.protein_goal_g} onChange={set('protein_goal_g')} type="number" />
          <Field label="Fat (g)" value={form.fats_goal_g} onChange={set('fats_goal_g')} type="number" />
        </section>

        {/* Favorites */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><IconStar size={15} stroke={1.5} />Favorites</h2>
          <p className="text-xs text-gray-400">Saved meals for quick logging. Add manually or from any meal entry.</p>
          <button
            onClick={() => navigate('/favorites')}
            className="w-full flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700"
          >
            Manage favorites
            <IconChevronRight size={16} stroke={1.8} className="text-gray-400" />
          </button>
        </section>

        {/* API Key */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><IconKey size={15} stroke={1.5} />Gemini API Key</h2>
          <p className="text-xs text-gray-400">Enter once — stored locally on this device only, never sent to any server.</p>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="AIza…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {apiKey && (
            <button
              onClick={() => { setApiKey(''); localStorage.removeItem('gemini_api_key') }}
              className="text-xs text-red-400 underline"
            >
              Clear API key
            </button>
          )}
        </section>

        <button
          onClick={handleSave}
          className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm"
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )
}

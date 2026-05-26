import { useState, useEffect } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useToast } from '../components/Toast'
import NutrinoLogo from '../components/NutrinoLogo'

export default function Settings() {
  const { profile, loading, save } = useProfile()
  const [form, setForm] = useState(profile)
  const [apiKey, setApiKey] = useState('')
  const toast = useToast()

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
    toast.show('Settings saved')
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Loading…</div>

  return (
    <div className="px-4 pt-10 pb-24 max-w-md mx-auto">
      <NutrinoLogo className="mb-1" />
      <h1 className="text-xl font-bold text-gray-900 mb-6 mt-1">Settings</h1>

      <div className="space-y-6">
        {/* Profile */}
        <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Profile</h2>
          <Field label="Your Name" value={form.name || ''} onChange={set('name')} placeholder="e.g. Chris" />
          <Field label="Dietician Name" value={form.dietician_name || ''} onChange={set('dietician_name')} placeholder="Appears on PDF reports" />
        </section>

        {/* Goals */}
        <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Daily Goals</h2>
          <Field label="Calories (kcal)" value={form.calorie_goal} onChange={set('calorie_goal')} type="number" />
          <Field label="Carbs (g)" value={form.carbs_goal_g} onChange={set('carbs_goal_g')} type="number" />
          <Field label="Protein (g)" value={form.protein_goal_g} onChange={set('protein_goal_g')} type="number" />
          <Field label="Fat (g)" value={form.fats_goal_g} onChange={set('fats_goal_g')} type="number" />
        </section>

        {/* API Key */}
        <section className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Gemini API Key</h2>
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
          Save Settings
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

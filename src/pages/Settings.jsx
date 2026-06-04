import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../contexts/AuthContext'
import NutrinoLogo from '../components/NutrinoLogo'
import { IconUser, IconTarget, IconStar, IconChevronRight, IconLogout } from '@tabler/icons-react'

export default function Settings() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { profile, loading, save } = useProfile()
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => { setForm(profile) }, [profile])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    await save({
      name: form.name,
      calorie_goal: parseInt(form.calorie_goal) || 2000,
      carbs_goal_g: parseInt(form.carbs_goal_g) || 200,
      protein_goal_g: parseInt(form.protein_goal_g) || 150,
      fats_goal_g: parseInt(form.fats_goal_g) || 65,
      dietician_name: form.dietician_name
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Loading…</div>

  return (
    <div className="px-4 pt-10 pb-24 max-w-md mx-auto">
      <NutrinoLogo className="mb-1" />
      <h1 className="text-xl font-bold text-gray-900 mb-6 mt-1">Settings</h1>

      <div className="space-y-6">
        {/* Profile */}
        <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <IconUser size={15} stroke={1.5} /> Profile
          </h2>
          <Field label="Your Name" value={form.name || ''} onChange={set('name')} placeholder="e.g. Chris" />
          <div>
            <Field label="Dietician Name" value={form.dietician_name || ''} onChange={set('dietician_name')} placeholder="e.g. Dr. Smith" />
            <p className="text-xs text-gray-400 mt-1">Their name appears on your weekly PDF report.</p>
          </div>
        </section>

        {/* Goals */}
        <section className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <IconTarget size={15} stroke={1.5} /> Daily Goals
          </h2>
          <div>
            <Field label="Calories (kcal)" value={form.calorie_goal} onChange={set('calorie_goal')} type="number" />
            <p className="text-xs text-gray-400 mt-1">Most adults target 1,600–2,400 kcal/day.</p>
          </div>
          <Field label="Carbs (g)" value={form.carbs_goal_g} onChange={set('carbs_goal_g')} type="number" />
          <Field label="Protein (g)" value={form.protein_goal_g} onChange={set('protein_goal_g')} type="number" />
          <Field label="Fat (g)" value={form.fats_goal_g} onChange={set('fats_goal_g')} type="number" />
        </section>

        {/* Favorites */}
        <section className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <IconStar size={15} stroke={1.5} /> Favorites
          </h2>
          <p className="text-xs text-gray-400">Saved meals for quick logging. Add manually or from any meal entry.</p>
          <button
            onClick={() => navigate('/favorites')}
            className="w-full flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700"
          >
            Manage favorites
            <IconChevronRight size={16} stroke={1.8} className="text-gray-400" />
          </button>
        </section>

        <button
          onClick={handleSave}
          className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm"
        >
          {saved ? '✓ Saved!' : 'Save'}
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full h-12 rounded-2xl border border-gray-200 text-sm font-medium text-gray-500 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <IconLogout size={16} stroke={1.5} />
          {signingOut ? 'Signing out…' : 'Sign out'}
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

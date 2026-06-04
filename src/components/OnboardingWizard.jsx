import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import NutrinoLogo from '../components/NutrinoLogo'
import { IconCamera, IconPencil, IconStar } from '@tabler/icons-react'

const DEFAULTS = {
  calorie_goal: 2000,
  carbs_goal_g: 200,
  protein_goal_g: 150,
  fats_goal_g: 65,
}

function onboardingKey(userId) {
  return `nutrino_onboarding_done_${userId}`
}

export function isOnboardingDone(userId) {
  return localStorage.getItem(onboardingKey(userId)) === 'true'
}

export function markOnboardingDone(userId) {
  localStorage.setItem(onboardingKey(userId), 'true')
}

export default function OnboardingWizard({ onDone }) {
  const { user } = useAuth()
  const { save } = useProfile()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [goals, setGoals] = useState(DEFAULTS)
  const [saving, setSaving] = useState(false)

  const setGoal = (field) => (e) => setGoals(g => ({ ...g, [field]: e.target.value }))

  const handleSaveGoals = async () => {
    setSaving(true)
    await save({
      name: name.trim() || null,
      calorie_goal: parseInt(goals.calorie_goal) || 2000,
      carbs_goal_g: parseInt(goals.carbs_goal_g) || 200,
      protein_goal_g: parseInt(goals.protein_goal_g) || 150,
      fats_goal_g: parseInt(goals.fats_goal_g) || 65,
    })
    setSaving(false)
    setStep(3)
  }

  const handleDone = () => {
    markOnboardingDone(user.id)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? 'w-8 bg-green-600' : s < step ? 'w-4 bg-green-300' : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
            <div className="flex justify-center mb-2">
              <NutrinoLogo />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to Nutrino</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Snap a photo of your meal — AI estimates the calories and macros in seconds.
              Your data, your history, your weekly report.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm"
            >
              Set up my profile →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Set your daily targets</h2>
              <p className="text-xs text-gray-400 mt-1">You can change these anytime in Settings.</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Your name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Chris"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Calories (kcal)</label>
              <input
                type="number"
                value={goals.calorie_goal}
                onChange={setGoal('calorie_goal')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">Most adults target 1,600–2,400 kcal/day</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Carbs (g)', field: 'carbs_goal_g' },
                { label: 'Protein (g)', field: 'protein_goal_g' },
                { label: 'Fat (g)', field: 'fats_goal_g' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                  <input
                    type="number"
                    value={goals[field]}
                    onChange={setGoal(field)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveGoals}
              disabled={saving}
              className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save & continue →'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="text-xl font-bold text-gray-900">How it works</h2>
            <div className="space-y-4">
              {[
                { icon: <IconCamera size={22} stroke={1.5} className="text-green-600" />, title: 'Photo', desc: 'Point your camera at any meal. AI does the math.' },
                { icon: <IconPencil size={22} stroke={1.5} className="text-green-600" />, title: 'Describe', desc: "Type what you ate if you don't have a photo." },
                { icon: <IconStar size={22} stroke={1.5} className="text-green-600" />, title: 'Favorites', desc: 'Save meals you eat often for one-tap logging.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    {icon}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleDone}
              className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm"
            >
              Start logging →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

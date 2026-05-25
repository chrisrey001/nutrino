export const HARDCODED_USER_ID = '00000000-0000-0000-0000-000000000001'

export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'morning_snack', label: 'Morning Snack', emoji: '☀️' },
  { value: 'lunch', label: 'Lunch', emoji: '🍽️' },
  { value: 'afternoon_snack', label: 'Afternoon Snack', emoji: '🫐' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'evening_snack', label: 'Evening Snack', emoji: '🌛' }
]

export function getMealMeta(mealType) {
  return MEAL_TYPES.find(m => m.value === mealType) ?? { label: mealType, emoji: '🍴' }
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function toLocalDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getWeekDates(referenceDate = new Date()) {
  const ref = new Date(referenceDate)
  const day = ref.getDay()
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return toLocalDateString(d)
  })
}

export function sumMacros(meals) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      carbs_g: acc.carbs_g + (m.carbs_g || 0),
      protein_g: acc.protein_g + (m.protein_g || 0),
      fats_g: acc.fats_g + (m.fats_g || 0)
    }),
    { calories: 0, carbs_g: 0, protein_g: 0, fats_g: 0 }
  )
}

export function macroBarColor(eaten, goal) {
  const pct = goal > 0 ? eaten / goal : 0
  if (pct > 1.25) return 'bg-red-500'
  if (pct > 1.1) return 'bg-amber-500'
  return 'bg-green-500'
}

export function generateDailyNote(totals, goals) {
  const calDiff = totals.calories - goals.calorie_goal
  const protPct = goals.protein_goal_g > 0 ? Math.round((totals.protein_g / goals.protein_goal_g) * 100) : 100
  const parts = []

  if (Math.abs(calDiff) < 50) {
    parts.push('On target for calories.')
  } else if (calDiff < 0) {
    parts.push(`${Math.abs(calDiff)} kcal under goal.`)
  } else {
    parts.push(`${calDiff} kcal over goal.`)
  }

  if (protPct < 85) {
    parts.push(`Protein at ${protPct}% of target.`)
  } else if (protPct > 115) {
    parts.push(`Protein exceeded target by ${protPct - 100}%.`)
  }

  return parts.join(' ')
}

export function generateWeeklyNote(weekTotals, goals, dayCount) {
  if (dayCount === 0) return 'No meals logged this week.'
  const avgCal = Math.round(weekTotals.calories / dayCount)
  const avgProt = Math.round(weekTotals.protein_g / dayCount)
  const calPct = Math.round((avgCal / goals.calorie_goal) * 100)
  const protPct = Math.round((avgProt / goals.protein_goal_g) * 100)

  const parts = [
    `Average daily intake: ${avgCal} kcal (${calPct}% of goal).`,
    `Average protein: ${avgProt}g (${protPct}% of goal).`
  ]

  if (calPct < 90) parts.push('Generally under calorie target — confirm this is intentional with your dietician.')
  else if (calPct > 110) parts.push('Slightly over calorie target most days.')
  else parts.push('Calorie intake well within target range.')

  return parts.join(' ')
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

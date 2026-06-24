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

export function macroBarColor(eaten, goal, color = 'bg-green-500') {
  const pct = goal > 0 ? eaten / goal : 0
  if (pct > 1.25) return 'bg-red-500'
  if (pct > 1.1) return 'bg-amber-500'
  return color
}

export function formatTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`
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

export function getMonthDates(monthOffset = 0) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + monthOffset
  const first = new Date(y, m, 1)
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(first)
    d.setDate(i + 1)
    return toLocalDateString(d)
  })
}

export function formatMonthYear(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function generateMonthlyNote(monthTotals, goals, dayCount, totalDays) {
  if (dayCount === 0) return 'No meals logged this month.'
  const avgCal = Math.round(monthTotals.calories / dayCount)
  const avgProt = Math.round(monthTotals.protein_g / dayCount)
  const calPct = goals.calorie_goal > 0 ? Math.round((avgCal / goals.calorie_goal) * 100) : 0
  const protPct = goals.protein_goal_g > 0 ? Math.round((avgProt / goals.protein_goal_g) * 100) : 0
  const parts = [
    `Logged ${dayCount} of ${totalDays} days.`,
    `Average daily intake: ${avgCal} kcal (${calPct}% of goal).`,
    `Average protein: ${avgProt}g (${protPct}% of goal).`
  ]
  if (calPct < 90) parts.push('Generally under calorie target this month.')
  else if (calPct > 110) parts.push('Slightly over calorie target on average.')
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

export function compressImageFile(file, maxDimension = 1024, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, maxDimension / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

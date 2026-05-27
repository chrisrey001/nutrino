import { compressImageFile, fileToBase64 } from './utils'

const MODEL = 'gemini-2.5-flash'
const API_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const SCHEMA = `{
  "description": "Brief description of the meal",
  "items": [
    {
      "name": "Item name",
      "estimated_portion": "e.g. 1 cup, 2 slices",
      "calories": 0,
      "carbs_g": 0,
      "protein_g": 0,
      "fats_g": 0
    }
  ],
  "total_calories": 0,
  "total_carbs_g": 0,
  "total_protein_g": 0,
  "total_fats_g": 0,
  "confidence": "high|medium|low",
  "notes": "Any caveats about the estimate"
}`

function photoPrompt(mealType, textContext) {
  const lines = [
    'Analyze this meal photo and estimate the nutritional content.',
    '',
    'Important estimation rules:',
    '- Base your estimate only on food that is clearly visible in the photo.',
    '- Do not add hidden calories for food that may be out of frame.',
    '- Photos flatten depth and make portions look larger; lean toward smaller estimates when uncertain.',
    '- Calories must be consistent with macros: total_calories ≈ carbs_g×4 + protein_g×4 + fats_g×9.',
    '- Round all numbers to the nearest whole number.',
  ]
  if (mealType) lines.push(`- Meal type: ${mealType}.`)
  if (textContext) lines.push(`- User context: ${textContext}`)
  lines.push('', 'Return ONLY valid JSON (no markdown, no backticks, no explanation):', SCHEMA)
  return lines.join('\n')
}

function textPrompt(description, mealType) {
  const lines = [
    `Estimate the nutritional content of this meal: "${description}"`,
    '',
    'Important estimation rules:',
    '- Use typical restaurant or home-cooked portion sizes unless a specific amount is stated.',
    '- Do not pad quantities beyond what is described.',
    '- Calories must be consistent with macros: total_calories ≈ carbs_g×4 + protein_g×4 + fats_g×9.',
    '- Round all numbers to the nearest whole number.',
  ]
  if (mealType) lines.push(`- Meal type: ${mealType}.`)
  lines.push('', 'Return ONLY valid JSON (no markdown, no backticks, no explanation):', SCHEMA)
  return lines.join('\n')
}

function validateMacroConsistency(data) {
  const calculatedCal = Math.round(
    (data.total_carbs_g || 0) * 4 + (data.total_protein_g || 0) * 4 + (data.total_fats_g || 0) * 9
  )
  if (calculatedCal > 0 && data.total_calories > calculatedCal * 1.15) {
    data.total_calories = calculatedCal
  }
  return data
}

async function callGemini(parts, apiKey) {
  const res = await fetch(`${API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { response_mime_type: 'application/json' }
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `Gemini error ${res.status}`
    throw new Error(msg)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    return validateMacroConsistency(JSON.parse(cleaned))
  } catch {
    throw new Error('Gemini returned invalid JSON. Try again.')
  }
}

async function callGeminiText(parts, apiKey) {
  const res = await fetch(`${API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini error ${res.status}`)
  }
  const data = await res.json()
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
}

export async function generateWeekInsight(weekStats, apiKey) {
  if (!apiKey) return null
  const { avgCal, calGoal, avgCarbs, carbsGoal, avgProtein, proteinGoal, avgFats, fatsGoal, daysLogged } = weekStats
  const prompt = `You are a friendly nutrition coach. Based on this week's food log data, write 2-3 concise sentences of practical insight to help the user understand their habits and one actionable tip. Be specific, not generic.

Data (daily averages):
- Days logged: ${daysLogged}/7
- Calories: ${avgCal} kcal (goal: ${calGoal} kcal)
- Carbs: ${avgCarbs}g (goal: ${carbsGoal}g)
- Protein: ${avgProtein}g (goal: ${proteinGoal}g)
- Fats: ${avgFats}g (goal: ${fatsGoal}g)

Write 2-3 plain sentences, no bullet points, no markdown. Start with the most notable pattern.`
  return callGeminiText([{ text: prompt }], apiKey)
}

export async function analyzeMeal(imageFile, apiKey, textContext = null, mealType = null) {
  if (!apiKey) throw new Error('No Gemini API key. Add it in Settings.')
  const compressed = await compressImageFile(imageFile)
  const base64Image = await fileToBase64(compressed)
  const mimeType = compressed.type || 'image/jpeg'
  return callGemini([
    { inline_data: { mime_type: mimeType, data: base64Image } },
    { text: photoPrompt(mealType, textContext) }
  ], apiKey)
}

export async function analyzeMealText(description, apiKey, mealType = null) {
  if (!apiKey) throw new Error('No Gemini API key. Add it in Settings.')
  if (!description.trim()) throw new Error('Please enter a meal description.')
  return callGemini([{ text: textPrompt(description, mealType) }], apiKey)
}

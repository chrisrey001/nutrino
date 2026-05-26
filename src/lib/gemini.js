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

const PHOTO_PROMPT = `Analyze this meal photo and estimate the nutritional content.

Return ONLY valid JSON (no markdown, no backticks, no explanation):
${SCHEMA}

Be realistic with portions visible in the photo. When uncertain, estimate conservatively. Round to nearest whole number.`

const textPrompt = (description) =>
  `Estimate the nutritional content of this meal based on the description:
"${description}"

Return ONLY valid JSON (no markdown, no backticks, no explanation):
${SCHEMA}

Use typical restaurant or home-cooked portion sizes unless specified. When uncertain, estimate conservatively. Round to nearest whole number.`

async function withRetry(fn, attempts = 3) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const isRetryable = err.status === 429 || err.status >= 500 || err.name === 'TypeError'
      if (!isRetryable) throw err
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
    }
  }
  throw lastErr
}

function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch {}
    }
    throw new Error('Gemini returned invalid JSON. Try again.')
  }
}

async function callGemini(parts, apiKey) {
  const doFetch = async () => {
    const res = await fetch(`${API_BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = err?.error?.message || `Gemini error ${res.status}`
      const e = new Error(msg)
      e.status = res.status
      throw e
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return extractJSON(text)
  }

  return withRetry(doFetch)
}

async function callGeminiText(parts, apiKey) {
  const doFetch = async () => {
    const res = await fetch(`${API_BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const e = new Error(err?.error?.message || `Gemini error ${res.status}`)
      e.status = res.status
      throw e
    }
    const data = await res.json()
    return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
  }

  return withRetry(doFetch)
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

export async function analyzeMeal(imageFile, apiKey) {
  if (!apiKey) throw new Error('No Gemini API key. Add it in Settings.')
  const compressed = await compressImageFile(imageFile)
  const base64Image = await fileToBase64(compressed)
  const mimeType = compressed.type || 'image/jpeg'
  return callGemini([
    { inline_data: { mime_type: mimeType, data: base64Image } },
    { text: PHOTO_PROMPT }
  ], apiKey)
}

export async function analyzeMealText(description, apiKey) {
  if (!apiKey) throw new Error('No Gemini API key. Add it in Settings.')
  if (!description.trim()) throw new Error('Please enter a meal description.')
  return callGemini([{ text: textPrompt(description) }], apiKey)
}

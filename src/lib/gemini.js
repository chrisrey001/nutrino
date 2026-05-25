import { compressImageFile, fileToBase64 } from './utils'

const MODEL = 'gemini-2.0-flash-lite'
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

async function callGemini(parts, apiKey) {
  const res = await fetch(`${API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `Gemini error ${res.status}`
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit')) {
      throw new Error(
        'Quota exceeded. Go to aistudio.google.com → your project → enable billing (free, just needs a card for identity verification), then retry.'
      )
    }
    throw new Error(msg)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Gemini returned invalid JSON. Try again.')
  }
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

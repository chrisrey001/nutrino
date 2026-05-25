const PROMPT = `Analyze this meal photo and estimate the nutritional content.

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
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
}

Be realistic with portions visible in the photo. When uncertain, estimate conservatively. Round to nearest whole number.`

export async function analyzeMeal(base64Image, apiKey) {
  if (!apiKey) throw new Error('No Gemini API key. Add it in Settings.')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            { text: PROMPT }
          ]
        }]
      })
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini error ${res.status}`)
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

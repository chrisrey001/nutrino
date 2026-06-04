import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const MODEL = 'gemini-2.5-flash'
const API_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const SCHEMA = `{
  "description": "Brief description of the meal",
  "items": [{"name": "Item name", "estimated_portion": "e.g. 1 cup", "calories": 0, "carbs_g": 0, "protein_g": 0, "fats_g": 0}],
  "total_calories": 0,
  "total_carbs_g": 0,
  "total_protein_g": 0,
  "total_fats_g": 0,
  "confidence": "high|medium|low",
  "notes": "Any caveats about the estimate"
}`

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function photoPrompt(mealType: string | null, textContext: string | null): string {
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
  if (textContext) {
    lines.push(`- User context: ${textContext}`)
    lines.push('- If the user context specifies a portion size or ingredient, treat it as ground truth and adjust macros accordingly, overriding the visual estimate.')
  }
  lines.push('', 'Return ONLY valid JSON (no markdown, no backticks, no explanation):', SCHEMA)
  return lines.join('\n')
}

function textPrompt(description: string, mealType: string | null): string {
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

function validateMacros(data: Record<string, unknown>): Record<string, unknown> {
  const calculated = Math.round(
    ((data.total_carbs_g as number) || 0) * 4 +
    ((data.total_protein_g as number) || 0) * 4 +
    ((data.total_fats_g as number) || 0) * 9
  )
  if (calculated > 0 && (data.total_calories as number) > calculated * 1.15) {
    if (Array.isArray(data.items)) {
      data.items = (data.items as Record<string, number>[]).map(item => ({
        ...item,
        calories: Math.round((item.carbs_g || 0) * 4 + (item.protein_g || 0) * 4 + (item.fats_g || 0) * 9)
      }))
    }
    data.total_calories = calculated
  }
  if (Array.isArray(data.items) && (data.items as unknown[]).length > 0) {
    data.total_calories = (data.items as Record<string, number>[]).reduce((s, item) => s + (item.calories || 0), 0)
  }
  return data
}

async function callGeminiJson(parts: unknown[]): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { response_mime_type: 'application/json' }
    })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message || `Gemini error ${res.status}`)
  }
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const cleaned = text.replace(/```json|```/g, '').trim()
  return validateMacros(JSON.parse(cleaned))
}

async function callGeminiText(parts: unknown[]): Promise<string> {
  const res = await fetch(`${API_BASE}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message || `Gemini error ${res.status}`)
  }
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }

  try {
    const body = await req.json() as {
      type: string
      imageBase64?: string
      mimeType?: string
      mealType?: string | null
      textContext?: string | null
      description?: string
      weekStats?: Record<string, number>
    }

    let result: unknown

    if (body.type === 'photo') {
      result = await callGeminiJson([
        { inline_data: { mime_type: body.mimeType || 'image/jpeg', data: body.imageBase64 } },
        { text: photoPrompt(body.mealType ?? null, body.textContext ?? null) }
      ])
    } else if (body.type === 'text') {
      result = await callGeminiJson([{ text: textPrompt(body.description!, body.mealType ?? null) }])
    } else if (body.type === 'insight') {
      const { avgCal, calGoal, avgCarbs, carbsGoal, avgProtein, proteinGoal, avgFats, fatsGoal, daysLogged } = body.weekStats!
      const prompt = `You are a friendly nutrition coach. Based on this week's food log data, write 2-3 concise sentences of practical insight to help the user understand their habits and one actionable tip. Be specific, not generic.

Data (daily averages):
- Days logged: ${daysLogged}/7
- Calories: ${avgCal} kcal (goal: ${calGoal} kcal)
- Carbs: ${avgCarbs}g (goal: ${carbsGoal}g)
- Protein: ${avgProtein}g (goal: ${proteinGoal}g)
- Fats: ${avgFats}g (goal: ${fatsGoal}g)

Write 2-3 plain sentences, no bullet points, no markdown. Start with the most notable pattern.`
      const insight = await callGeminiText([{ text: prompt }])
      result = { insight }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

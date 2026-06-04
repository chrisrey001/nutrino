import { supabase } from './supabase'
import { compressImageFile, fileToBase64 } from './utils'

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-meal`

async function callEdgeFunction(body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `Analysis failed (${res.status})`)
  }
  return res.json()
}

export async function analyzeMeal(imageFile, _unused, textContext = null, mealType = null) {
  const compressed = await compressImageFile(imageFile)
  const imageBase64 = await fileToBase64(compressed)
  return callEdgeFunction({
    type: 'photo',
    imageBase64,
    mimeType: compressed.type || 'image/jpeg',
    mealType,
    textContext: textContext || null
  })
}

export async function analyzeMealText(description, _unused, mealType = null) {
  if (!description.trim()) throw new Error('Please enter a meal description.')
  return callEdgeFunction({ type: 'text', description, mealType })
}

export async function generateWeekInsight(weekStats) {
  const data = await callEdgeFunction({ type: 'insight', weekStats })
  return data?.insight ?? null
}

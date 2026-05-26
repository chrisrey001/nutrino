import { supabase } from './supabase'
import { HARDCODED_USER_ID, toLocalDateString } from './utils'

export async function quickLogMeal(sourceMeal) {
  const today = toLocalDateString()
  const { error } = await supabase.from('meals').insert({
    user_id: HARDCODED_USER_ID,
    date: today,
    meal_type: sourceMeal.meal_type,
    description: sourceMeal.description,
    calories: sourceMeal.calories,
    carbs_g: sourceMeal.carbs_g,
    protein_g: sourceMeal.protein_g,
    fats_g: sourceMeal.fats_g,
    items: sourceMeal.items || []
  })
  if (error) throw error
}

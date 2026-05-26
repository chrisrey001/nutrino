import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { HARDCODED_USER_ID } from '../lib/utils'

export function useRecentMeals() {
  const [recentMeals, setRecentMeals] = useState([])

  useEffect(() => {
    supabase
      .from('meals')
      .select('description, meal_type, calories, carbs_g, protein_g, fats_g, items')
      .eq('user_id', HARDCODED_USER_ID)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data) return
        const seen = new Set()
        const deduped = []
        for (const meal of data) {
          const key = (meal.description || '').toLowerCase().trim()
          if (!key || seen.has(key)) continue
          seen.add(key)
          deduped.push(meal)
          if (deduped.length >= 8) break
        }
        setRecentMeals(deduped)
      })
  }, [])

  return recentMeals
}

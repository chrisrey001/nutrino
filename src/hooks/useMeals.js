import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useMeals(date) {
  const { user } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!date || !user?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: true })
    setMeals(data || [])
    setLoading(false)
  }, [date, user?.id])

  useEffect(() => { fetch() }, [fetch])

  return { meals, loading, refresh: fetch }
}

export function useMealsRange(dates) {
  const { user } = useAuth()
  const [mealsByDate, setMealsByDate] = useState({})
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!dates?.length || !user?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', dates[0])
      .lte('date', dates[dates.length - 1])
      .order('created_at', { ascending: true })

    const byDate = {}
    for (const d of dates) byDate[d] = []
    for (const meal of data || []) {
      if (!byDate[meal.date]) byDate[meal.date] = []
      byDate[meal.date].push(meal)
    }
    setMealsByDate(byDate)
    setLoading(false)
  }, [dates?.join(','), user?.id])

  useEffect(() => { fetch() }, [fetch])

  return { mealsByDate, loading, refresh: fetch }
}

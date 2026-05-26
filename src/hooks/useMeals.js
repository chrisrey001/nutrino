import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { HARDCODED_USER_ID } from '../lib/utils'

export function useMeals(date) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!date) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', HARDCODED_USER_ID)
      .eq('date', date)
      .order('created_at', { ascending: true })
    if (err) setError(err.message)
    setMeals(data || [])
    setLoading(false)
  }, [date])

  useEffect(() => { fetch() }, [fetch])

  return { meals, loading, error, refresh: fetch }
}

export function useMealsRange(dates) {
  const [mealsByDate, setMealsByDate] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!dates?.length) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', HARDCODED_USER_ID)
      .gte('date', dates[0])
      .lte('date', dates[dates.length - 1])
      .order('created_at', { ascending: true })

    if (err) setError(err.message)

    const byDate = {}
    for (const d of dates) byDate[d] = []
    for (const meal of data || []) {
      if (!byDate[meal.date]) byDate[meal.date] = []
      byDate[meal.date].push(meal)
    }
    setMealsByDate(byDate)
    setLoading(false)
  }, [dates?.join(',')])

  useEffect(() => { fetch() }, [fetch])

  return { mealsByDate, loading, error, refresh: fetch }
}

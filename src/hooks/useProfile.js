import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { HARDCODED_USER_ID } from '../lib/utils'

const DEFAULT_PROFILE = {
  id: HARDCODED_USER_ID,
  name: '',
  calorie_goal: 2100,
  carbs_goal_g: 131,
  protein_goal_g: 236,
  fats_goal_g: 70,
  dietician_name: ''
}

export function useProfile() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', HARDCODED_USER_ID)
      .single()
    if (data) setProfile(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const save = async (updates) => {
    const { data } = await supabase
      .from('profiles')
      .upsert({ ...updates, id: HARDCODED_USER_ID, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (data) setProfile(data)
    return data
  }

  return { profile, loading, save, refresh: fetch }
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const defaultProfile = (userId) => ({
  id: userId ?? '',
  name: '',
  calorie_goal: 2000,
  carbs_goal_g: 200,
  protein_goal_g: 150,
  fats_goal_g: 65,
  dietician_name: ''
})

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(() => defaultProfile(user?.id))
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) setProfile(data)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetch() }, [fetch])

  const save = async (updates) => {
    if (!user?.id) return null
    const { data } = await supabase
      .from('profiles')
      .upsert({ ...updates, id: user.id, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (data) setProfile(data)
    return data
  }

  return { profile, loading, save, refresh: fetch }
}

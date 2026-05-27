import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { HARDCODED_USER_ID } from '../lib/utils'

export function useFavorites() {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', HARDCODED_USER_ID)
      .order('created_at', { ascending: false })
    setFavorites(data || [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const create = async (data) => {
    const { data: row } = await supabase
      .from('favorites')
      .insert({
        user_id: HARDCODED_USER_ID,
        name: data.name || data.description || 'Unnamed',
        description: data.description || '',
        calories: data.calories || 0,
        carbs_g: data.carbs_g || 0,
        protein_g: data.protein_g || 0,
        fats_g: data.fats_g || 0,
        items: data.items || null
      })
      .select()
      .single()
    if (row) setFavorites(prev => [row, ...prev])
    return row
  }

  const update = async (id, data) => {
    const { data: row } = await supabase
      .from('favorites')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (row) setFavorites(prev => prev.map(f => f.id === id ? row : f))
    return row
  }

  const remove = async (id) => {
    await supabase.from('favorites').delete().eq('id', id)
    setFavorites(prev => prev.filter(f => f.id !== id))
  }

  return { favorites, loading, create, update, remove, refresh: fetch }
}

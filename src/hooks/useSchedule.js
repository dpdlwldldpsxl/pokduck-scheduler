import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useAcademies() {
  const { user } = useAuth()
  const [academies, setAcademies] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('academies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    if (data) setAcademies(data)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const add = async (name, color, icon) => {
    const { data } = await supabase
      .from('academies')
      .insert({ user_id: user.id, name, color, icon })
      .select()
    if (data) setAcademies((prev) => [...prev, ...data])
    return data?.[0]
  }

  const remove = async (id) => {
    await supabase.from('academies').delete().eq('id', id)
    setAcademies((prev) => prev.filter((a) => a.id !== id))
  }

  return { academies, loading, add, remove, reload: load }
}

export function useScheduleItems(academyId) {
  const { user } = useAuth()
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    let query = supabase
      .from('schedule_items')
      .select('*, academies(name, color, icon)')
      .eq('user_id', user.id)
      .order('start_time')
    if (academyId) query = query.eq('academy_id', academyId)
    const { data } = await query
    if (data) setItems(data)
  }, [user, academyId])

  useEffect(() => { load() }, [load])

  const add = async (item) => {
    const { data } = await supabase
      .from('schedule_items')
      .insert({ user_id: user.id, ...item })
      .select('*, academies(name, color, icon)')
    if (data) {
      await load()
    }
  }

  const remove = async (id) => {
    await supabase.from('schedule_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const update = async (id, updates) => {
    await supabase
      .from('schedule_items')
      .update(updates)
      .eq('id', id)
    await load()
  }

  return { items, add, remove, update, reload: load }
}

export function useTodaySchedule() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const dayOfWeek = now.getDay()

    const { data } = await supabase
      .from('schedule_items')
      .select('*, academies(name, color, icon)')
      .eq('user_id', user.id)
      .eq('day_of_week', dayOfWeek)
      .order('start_time')
    if (data) setItems(data)
    setLoading(false)
  }, [user])

  // 페이지 포커스될 때마다 새로고침
  useEffect(() => {
    load()
    const handleFocus = () => load()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [load])

  return { items, loading, reload: load }
}

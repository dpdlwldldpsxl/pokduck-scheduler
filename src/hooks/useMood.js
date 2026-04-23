import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const MOODS = [
  { key: 'burnout', emoji: '😫', label: '번아웃', ambience: 'fire' },
  { key: 'angry', emoji: '😤', label: '짜증', ambience: 'ocean' },
  { key: 'complex', emoji: '🤔', label: '복잡', ambience: 'forest' },
  { key: 'calm', emoji: '😌', label: '평온', ambience: 'rain' },
  { key: 'happy', emoji: '😊', label: '좋음', ambience: 'cafe' },
]

export const ENERGIES = [
  { key: 'tired', emoji: '😴', label: '피곤' },
  { key: 'normal', emoji: '😶', label: '보통' },
  { key: 'good', emoji: '💪', label: '좋음' },
  { key: 'foggy', emoji: '😵‍💫', label: '멍함' },
  { key: 'sick', emoji: '🤕', label: '아픔' },
]

function todayKst() {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  return kst.toISOString().split('T')[0]
}

export function useMood() {
  const { user } = useAuth()
  const [today, setToday] = useState(null)
  const [recent, setRecent] = useState([])

  const load = useCallback(async () => {
    if (!user) return
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const since = sevenDaysAgo.toISOString().split('T')[0]
    const { data } = await supabase
      .from('mood_logs')
      .select('id, mood, energy, logged_at, note')
      .eq('user_id', user.id)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false })
    if (data) {
      setRecent(data)
      const t = todayKst()
      setToday(data.find((m) => m.logged_at === t) || null)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // 필드 하나만 업서트 — 나머지 필드 보존 (기분만 찍고 에너지 유지 등)
  const upsertField = async (field, value) => {
    if (!user) return null
    const t = todayKst()
    const { data: existing } = await supabase
      .from('mood_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('logged_at', t)
      .maybeSingle()

    let row
    if (existing) {
      const { data } = await supabase
        .from('mood_logs')
        .update({ [field]: value })
        .eq('id', existing.id)
        .select()
        .single()
      row = data
    } else {
      const { data } = await supabase
        .from('mood_logs')
        .insert({ user_id: user.id, logged_at: t, [field]: value })
        .select()
        .single()
      row = data
    }

    if (row) {
      setToday(row)
      setRecent((prev) => {
        const without = prev.filter((m) => m.logged_at !== t)
        return [row, ...without].sort((a, b) => b.logged_at.localeCompare(a.logged_at))
      })
    }
    return row
  }

  const setMood = (mood) => upsertField('mood', mood)
  const setEnergy = (energy) => upsertField('energy', energy)

  // 필드 하나 지움. 둘 다 비면 행 삭제.
  const clearField = async (field) => {
    if (!user || !today) return
    const remaining = { ...today, [field]: null }
    if (!remaining.mood && !remaining.energy) {
      await supabase.from('mood_logs').delete().eq('id', today.id)
      setToday(null)
      setRecent((prev) => prev.filter((m) => m.id !== today.id))
    } else {
      const { data } = await supabase
        .from('mood_logs')
        .update({ [field]: null })
        .eq('id', today.id)
        .select()
        .single()
      if (data) {
        setToday(data)
        setRecent((prev) => prev.map((m) => (m.id === data.id ? data : m)))
      }
    }
  }

  const clearMood = () => clearField('mood')
  const clearEnergy = () => clearField('energy')

  return {
    today,           // 오늘 로우 (mood, energy 둘 다 담김)
    todayMood: today, // 하위호환 — 기존 consumers 위해 유지
    recentMoods: recent,
    recent,
    setMood,
    setEnergy,
    clearMood,
    clearEnergy,
    reload: load,
  }
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// 에빙하우스 망각곡선 기반 복습 날짜 계산
function getNextReview(studiedAt, reviewCount) {
  const intervals = [1, 3, 7, 14, 30]
  const days = intervals[Math.min(reviewCount, intervals.length - 1)]
  const date = new Date(studiedAt)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export function useStudyNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('study_notes')
      .select('*, academies(name, icon, color)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setNotes(data)
  }, [user])

  useEffect(() => { load() }, [load])

  const add = async (title, content, academyId) => {
    const studiedAt = new Date().toISOString().split('T')[0]
    const nextReview = getNextReview(studiedAt, 0)
    const { data } = await supabase
      .from('study_notes')
      .insert({ user_id: user.id, title, content, academy_id: academyId || null, studied_at: studiedAt, next_review: nextReview })
      .select('*, academies(name, icon, color)')
    if (data) setNotes((prev) => [data[0], ...prev])
  }

  const markReviewed = async (note) => {
    const newCount = (note.review_count || 0) + 1
    const nextReview = getNextReview(note.studied_at, newCount)
    await supabase
      .from('study_notes')
      .update({ review_count: newCount, next_review: nextReview })
      .eq('id', note.id)
    await load()
  }

  const remove = async (id) => {
    await supabase.from('study_notes').delete().eq('id', id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  // 오늘 복습해야 하는 것
  const today = new Date().toISOString().split('T')[0]
  const dueForReview = notes.filter((n) => n.next_review && n.next_review <= today)

  return { notes, dueForReview, add, markReviewed, remove, reload: load }
}

export function useHabits() {
  const { user } = useAuth()
  const [habits, setHabits] = useState([])
  const [todayLogs, setTodayLogs] = useState([])
  const [streaks, setStreaks] = useState({})

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    if (habitsData) setHabits(habitsData)

    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_date', today)
    if (logsData) setTodayLogs(logsData.map((l) => l.habit_id))

    // 스트릭 계산
    if (habitsData) {
      const streakMap = {}
      for (const habit of habitsData) {
        const { data: logs } = await supabase
          .from('habit_logs')
          .select('logged_date')
          .eq('habit_id', habit.id)
          .order('logged_date', { ascending: false })
          .limit(60)
        let streak = 0
        if (logs) {
          const d = new Date()
          for (let i = 0; i < 60; i++) {
            const dateStr = d.toISOString().split('T')[0]
            if (logs.find((l) => l.logged_date === dateStr)) {
              streak++
            } else if (i > 0) break
            d.setDate(d.getDate() - 1)
          }
        }
        streakMap[habit.id] = streak
      }
      setStreaks(streakMap)
    }
  }, [user, today])

  useEffect(() => { load() }, [load])

  const add = async (title, icon = '✅') => {
    const { data } = await supabase
      .from('habits')
      .insert({ user_id: user.id, title, icon })
      .select()
    if (data) setHabits((prev) => [...prev, data[0]])
  }

  const toggle = async (habitId) => {
    if (todayLogs.includes(habitId)) {
      await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('logged_date', today)
      setTodayLogs((prev) => prev.filter((id) => id !== habitId))
    } else {
      await supabase.from('habit_logs').insert({ habit_id: habitId, user_id: user.id, logged_date: today })
      setTodayLogs((prev) => [...prev, habitId])
    }
    await load()
  }

  const remove = async (id) => {
    await supabase.from('habits').delete().eq('id', id)
    setHabits((prev) => prev.filter((h) => h.id !== id))
  }

  const allDoneToday = habits.length > 0 && habits.every((h) => todayLogs.includes(h.id))

  return { habits, todayLogs, streaks, allDoneToday, add, toggle, remove, reload: load }
}

export function useGoals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setGoals(data)
  }, [user])

  useEffect(() => { load() }, [load])

  const add = async (title, targetDate) => {
    const { data } = await supabase
      .from('goals')
      .insert({ user_id: user.id, title, target_date: targetDate || null })
      .select()
    if (data) setGoals((prev) => [data[0], ...prev])
  }

  const toggleComplete = async (id) => {
    const goal = goals.find((g) => g.id === id)
    await supabase.from('goals').update({ is_completed: !goal.is_completed }).eq('id', id)
    await load()
  }

  const remove = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  return { goals, add, toggleComplete, remove, reload: load }
}

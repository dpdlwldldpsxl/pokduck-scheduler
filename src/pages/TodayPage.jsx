import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import IntroOverlay from '../components/IntroOverlay'
import CelebrationOverlay from '../components/CelebrationOverlay'
import Header from '../components/Header'
import SpeechBubble from '../components/SpeechBubble'
import TodaySchedule from '../components/TodaySchedule'
import TaskList from '../components/TaskList'
import WeekGrid from '../components/WeekGrid'
import AIScheduler from '../components/AIScheduler'
import BottomNav from '../components/BottomNav'
import { getTodayInfo, POKDUCK_DAY_CONFIG, CHEERS } from '../data/scheduleData'

export default function TodayPage() {
  const { user } = useAuth()
  const todayInfo = getTodayInfo()
  const todayConfig = POKDUCK_DAY_CONFIG[todayInfo.dayName]

  const [showIntro, setShowIntro] = useState(true)
  const [showCelebrate, setShowCelebrate] = useState(false)
  const [tasks, setTasks] = useState([])
  const [message, setMessage] = useState(todayConfig.msg)
  const [mood, setMood] = useState(todayConfig.mood)

  useEffect(() => {
    loadTasks()
  }, [user])

  const loadTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (data) setTasks(data)
  }

  const handleAdd = async (text, category) => {
    const { data } = await supabase
      .from('tasks')
      .insert({ user_id: user.id, text, category, is_done: false })
      .select()
    if (data) setTasks([...tasks, ...data])
  }

  const handleToggle = async (index) => {
    const task = tasks[index]
    const newDone = !task.is_done
    await supabase
      .from('tasks')
      .update({ is_done: newDone, completed_at: newDone ? new Date().toISOString() : null })
      .eq('id', task.id)

    const newTasks = tasks.map((t, i) =>
      i === index ? { ...t, is_done: newDone } : t
    )
    setTasks(newTasks)

    if (newDone) {
      const allDone = newTasks.every((t) => t.is_done)
      if (allDone && newTasks.length > 0) {
        setMessage('오늘 할 일 다 했어?! 최고야!!! 폭덕이가 너무 자랑스러워!! 🎉')
        setMood('celebrate')
        setShowCelebrate(true)
      } else {
        setMessage(CHEERS[Math.floor(Math.random() * CHEERS.length)])
        setMood('happy')
      }
    } else {
      setMessage(todayConfig.msg)
      setMood(todayConfig.mood)
    }
  }

  const handleDelete = async (index) => {
    const task = tasks[index]
    await supabase.from('tasks').delete().eq('id', task.id)
    setTasks(tasks.filter((_, i) => i !== index))
  }

  // TaskList expects { text, category, done } but DB has { text, category, is_done }
  const tasksForList = tasks.map((t) => ({ ...t, done: t.is_done }))

  return (
    <>
      {showIntro && <IntroOverlay onClose={() => setShowIntro(false)} />}
      {showCelebrate && <CelebrationOverlay onClose={() => setShowCelebrate(false)} />}
      <Header mood={mood} dateStr={todayInfo.dateStr} />
      <SpeechBubble message={message} />
      <TodaySchedule dayName={todayInfo.dayName} />
      <TaskList
        tasks={tasksForList}
        onAdd={handleAdd}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
      <AIScheduler existingTasks={tasksForList} onAddTask={handleAdd} />
      <WeekGrid todayName={todayInfo.dayName} />
      <BottomNav />
    </>
  )
}

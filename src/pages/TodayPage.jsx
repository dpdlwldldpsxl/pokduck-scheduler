import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import SpeechBubble from '../components/SpeechBubble'
import TaskList from '../components/TaskList'
import BottomNav from '../components/BottomNav'
import { getTodayInfo, POKDUCK_DAY_CONFIG, CHEERS } from '../data/scheduleData'

export default function TodayPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const todayInfo = getTodayInfo()
  const todayConfig = POKDUCK_DAY_CONFIG[todayInfo.dayName]

  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [message, setMessage] = useState(todayConfig.msg)
  const [mood, setMood] = useState(todayConfig.mood)

  useEffect(() => {
    loadProfile()
    loadTasks()
  }, [user])

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    if (data) {
      if (!data.display_name) {
        navigate('/nickname', { replace: true })
        return
      }
      setProfile(data)
    }
  }

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

  const displayName = profile?.display_name || '사용자'
  const tasksForList = tasks.map((t) => ({ ...t, done: t.is_done }))

  return (
    <>
      <Header mood={mood} dateStr={todayInfo.dateStr} />
      <SpeechBubble message={`${displayName}님, ${message}`} />

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', color: '#888' }}>
            {displayName}님 환영해요!
          </p>
          <button onClick={signOut} className="logout-btn">로그아웃</button>
        </div>
      </section>

      <TaskList
        tasks={tasksForList}
        onAdd={handleAdd}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />

      <BottomNav />
    </>
  )
}

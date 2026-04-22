import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTodaySchedule } from '../hooks/useSchedule'
import Header from '../components/Header'
import SpeechBubble from '../components/SpeechBubble'
import TaskList from '../components/TaskList'
import BottomNav from '../components/BottomNav'
import { getTodayInfo, getDailyMessage, CHEERS } from '../data/scheduleData'
import { useSound } from '../hooks/useSound'
import SoundToggle from '../components/SoundToggle'

export default function TodayPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const todayInfo = getTodayInfo()
  const dailyMsg = getDailyMessage()
  const { items: todaySchedule, loading: scheduleLoading, reload: reloadSchedule } = useTodaySchedule()
  const { playBgm, playSfx } = useSound()

  useEffect(() => {
    playBgm('main')
  }, [])

  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [message, setMessage] = useState(dailyMsg.msg)
  const [mood, setMood] = useState(dailyMsg.mood)
  const [showCongrats, setShowCongrats] = useState(false)

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
    playSfx('add')
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
        playSfx('celebrate')
        setMessage('오늘 할 일 다 했어?! 최고야!!! 폭덕이가 너무 자랑스러워!! 🎉')
        setMood('celebrate')
        setShowCongrats(true)
      } else {
        playSfx('confirm')
        setMessage(CHEERS[Math.floor(Math.random() * CHEERS.length)])
        setMood('happy')
      }
    } else {
      setMessage(dailyMsg.msg)
      setMood(dailyMsg.mood)
    }
  }

  const handleDelete = async (index) => {
    playSfx('cancel')
    const task = tasks[index]
    await supabase.from('tasks').delete().eq('id', task.id)
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const displayName = profile?.display_name || '사용자'
  const tasksForList = tasks.map((t) => ({ ...t, done: t.is_done }))

  return (
    <>
      {showCongrats && (
        <div className="congrats-overlay" onClick={() => setShowCongrats(false)}>
          <div className="congrats-card" onClick={(e) => e.stopPropagation()}>
            <video
              className="congrats-video"
              src="/images/pokduck_congrats.mp4"
              autoPlay
              muted
              loop
              playsInline
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <h2 className="congrats-title">오늘도 고생했어요!</h2>
            <p className="congrats-msg">
              {displayName}님, 할 일을 전부 완료했어요!<br/>
              폭덕이가 정말 자랑스러워! 🎉🦆
            </p>
            <button className="congrats-btn" onClick={() => { playSfx('confirm'); setShowCongrats(false) }}>
              폭덕이 고마워!
            </button>
          </div>
        </div>
      )}

      <Header mood={mood} dateStr={todayInfo.dateStr} />
      <SpeechBubble message={`${displayName}님, ${message}`} />

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', color: '#888' }}>
            {displayName}님 환영해요!
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SoundToggle />
            <button onClick={signOut} className="logout-btn">로그아웃</button>
          </div>
        </div>
      </section>

      {/* 오늘 일정 타임라인 */}
      <section className="card">
        <h2>📋 오늘 일정</h2>
        {scheduleLoading ? (
          <p style={{ color: '#aaa', fontSize: '14px', padding: '8px 0' }}>불러오는 중...</p>
        ) : todaySchedule.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: '#aaa', fontSize: '14px' }}>오늘은 등록된 일정이 없어요</p>
            <button
              className="add-btn"
              style={{ marginTop: '8px' }}
              onClick={() => navigate('/schedule')}
            >일정 추가하러 가기</button>
          </div>
        ) : (
          <div className="timeline">
            {todaySchedule.map((item) => (
              <div key={item.id} className="timeline-item" style={{ '--accent': item.academies?.color || '#7cc47c' }}>
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <span className="timeline-time">{item.start_time?.slice(0, 5)}</span>
                  <span className="timeline-title">{item.academies?.icon} {item.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}
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

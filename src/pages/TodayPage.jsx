import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTodaySchedule } from '../hooks/useSchedule'
import { useMood, MOODS, ENERGIES } from '../hooks/useMood'
import { useStudyNotes, useHabits } from '../hooks/useGoals'
import { getSmartSuggestion } from '../lib/smartSuggestion'
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
  const { today: todayLog, setMood: setUserMood, setEnergy: setUserEnergy, clearMood, clearEnergy } = useMood()
  const { dueForReview } = useStudyNotes()
  const { habits, todayLogs: todayHabitLogs } = useHabits()
  const { playBgm, playSfx } = useSound()

  useEffect(() => {
    playBgm('main')
    if (sessionStorage.getItem('pokduck-just-logged-in')) {
      sessionStorage.removeItem('pokduck-just-logged-in')
      setTimeout(() => playSfx('login'), 500)
    }
  }, [])

  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [message, setMessage] = useState(dailyMsg.msg)
  const [mood, setMood] = useState(dailyMsg.mood)
  const [showCongrats, setShowCongrats] = useState(false)

  // 안정 키 (배열 레퍼런스 대신 ID 문자열로 의존)
  const dueIdsKey = (dueForReview || []).map((n) => n.id).join(',')
  const habitIdsKey = (habits || []).map((h) => h.id).join(',')
  const habitLogsKey = (todayHabitLogs || []).join(',')
  const scheduleKey = (todaySchedule || []).map((s) => s.id).join(',')

  // 스마트 추천 엔진 — useMemo로 무한 렌더 방지
  const suggestion = useMemo(() => {
    if (scheduleLoading) return null
    return getSmartSuggestion({
      displayName: profile?.display_name || '너',
      todaySchedule,
      dueStudyNotes: dueForReview || [],
      habits: habits || [],
      todayHabitLogs: todayHabitLogs || [],
      todayMood: todayLog?.mood || null,
      todayEnergy: todayLog?.energy || null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scheduleLoading,
    scheduleKey,
    dueIdsKey,
    habitIdsKey,
    habitLogsKey,
    todayLog?.mood,
    todayLog?.energy,
    profile?.display_name,
  ])

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
    // 전체 가져와서 클라이언트에서 필터 (Supabase or() ISO 타임스탬프 이슈 회피)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (!data) return

    const kstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    kstNow.setHours(0, 0, 0, 0)
    const todayStart = kstNow.getTime()

    // 미완료는 항상 보임 (이월), 완료는 오늘 완료된 것만 보임
    const filtered = data.filter((t) => {
      if (!t.is_done) return true
      if (!t.completed_at) return false
      return new Date(t.completed_at).getTime() >= todayStart
    })
    setTasks(filtered)
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

      {/* 오늘 기분 1탭 입력 */}
      <section className="card mood-card">
        <h2 className="mood-title">
          지금 어때? <span className="mood-duck">🦆</span>
        </h2>
        <div className="mood-picker">
          {MOODS.map((m) => {
            const selected = todayLog?.mood === m.key
            return (
              <button
                key={m.key}
                type="button"
                className={`mood-btn ${selected ? 'selected' : ''}`}
                onClick={() => {
                  if (selected) {
                    playSfx('cancel')
                    clearMood()
                  } else {
                    playSfx('confirm')
                    setUserMood(m.key)
                  }
                }}
                aria-label={m.label}
              >
                <span className="mood-emoji">{m.emoji}</span>
                <span className="mood-label">{m.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 오늘 에너지(몸 상태) 1탭 입력 */}
      <section className="card energy-card">
        <h2 className="mood-title">
          몸은 어때? <span className="mood-duck">💪</span>
        </h2>
        <div className="mood-picker">
          {ENERGIES.map((e) => {
            const selected = todayLog?.energy === e.key
            return (
              <button
                key={e.key}
                type="button"
                className={`mood-btn energy-btn ${selected ? 'selected' : ''}`}
                onClick={() => {
                  if (selected) {
                    playSfx('cancel')
                    clearEnergy()
                  } else {
                    playSfx('confirm')
                    setUserEnergy(e.key)
                  }
                }}
                aria-label={e.label}
              >
                <span className="mood-emoji">{e.emoji}</span>
                <span className="mood-label">{e.label}</span>
              </button>
            )
          })}
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

      {suggestion && (
        <section className="card suggestion-card">
          <div className="suggestion-row">
            <img src="/images/pokduck_default.png" alt="폭덕이" className="suggestion-avatar" />
            <div style={{ flex: 1 }}>
              <p className="suggestion-text">
                <span className="suggestion-emoji">{suggestion.emoji}</span> {suggestion.text}
              </p>
              {suggestion.action && (
                <button
                  className="suggestion-action"
                  onClick={() => { playSfx('click'); navigate(suggestion.action.path) }}
                >
                  {suggestion.action.label} →
                </button>
              )}
            </div>
          </div>
        </section>
      )}

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

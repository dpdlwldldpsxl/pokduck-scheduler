import { useState } from 'react'
import { useStudyNotes, useHabits, useGoals } from '../hooks/useGoals'
import { useAcademies } from '../hooks/useSchedule'
import { useSound } from '../hooks/useSound'
import BottomNav from '../components/BottomNav'

const TABS = ['메모', '습관', '목표']
const HABIT_ICONS = ['✅', '📚', '🏃', '🧘', '🎵', '💪', '🧠', '✍️']

export default function GoalsPage() {
  const [tab, setTab] = useState('메모')
  const { playSfx } = useSound()
  const { academies } = useAcademies()
  const { notes, dueForReview, add: addNote, markReviewed, remove: removeNote } = useStudyNotes()
  const { habits, todayLogs, streaks, allDoneToday, add: addHabit, toggle: toggleHabit, remove: removeHabit } = useHabits()
  const { goals, add: addGoal, toggleComplete, remove: removeGoal } = useGoals()

  // 학습 메모 입력 (한 줄)
  const [quickNote, setQuickNote] = useState('')

  // 습관 입력
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [habitTitle, setHabitTitle] = useState('')
  const [habitIcon, setHabitIcon] = useState('✅')

  // 목표 입력
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDate, setGoalDate] = useState('')

  const handleQuickNote = async () => {
    if (!quickNote.trim()) return
    playSfx('add')
    // 학원 자동 감지
    const text = quickNote.trim()
    let matchedAcademy = null
    for (const a of academies) {
      if (text.includes(a.name)) {
        matchedAcademy = a.id
        break
      }
    }
    await addNote(text, '', matchedAcademy)
    setQuickNote('')
  }

  const handleAddHabit = async () => {
    if (!habitTitle.trim()) return
    playSfx('add')
    await addHabit(habitTitle.trim(), habitIcon)
    setHabitTitle('')
    setShowAddHabit(false)
  }

  const handleAddGoal = async () => {
    if (!goalTitle.trim()) return
    playSfx('add')
    await addGoal(goalTitle.trim(), goalDate || null)
    setGoalTitle('')
    setGoalDate('')
    setShowAddGoal(false)
  }

  return (
    <>
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>🎯 목표</h2>
        <div className="goals-tabs">
          {TABS.map((t) => (
            <button key={t} className={`goals-tab${tab === t ? ' active' : ''}`} onClick={() => { playSfx('click'); setTab(t) }}>
              {t === '메모' ? '📝' : t === '습관' ? '🔥' : '🎯'} {t}
            </button>
          ))}
        </div>
      </div>

      {/* 학습 메모 탭 */}
      {tab === '메모' && (
        <>
          {dueForReview.length > 0 && (
            <section className="card review-card">
              <h2>🔔 오늘 복습할 것</h2>
              {dueForReview.map((note) => (
                <div key={note.id} className="review-item">
                  <div>
                    <span className="review-academy">{note.academies?.icon} {note.academies?.name || '기타'}</span>
                    <p className="review-title">{note.title}</p>
                  </div>
                  <button className="review-btn" onClick={() => { playSfx('confirm'); markReviewed(note) }}>복습 완료</button>
                </div>
              ))}
            </section>
          )}

          <section className="card">
            <h2>📝 학습 메모</h2>
            <div className="quick-note-row">
              <input
                type="text"
                className="quick-note-input"
                placeholder="오늘 뭐 배웠어? (예: 영어에서 I'd appreciate 배움)"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickNote()}
              />
              <button className="quick-note-btn" onClick={handleQuickNote} disabled={!quickNote.trim()}>📝</button>
            </div>
            <p style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>학원 이름 포함하면 자동 분류! (예: "영어에서 ~~")</p>

            {notes.length === 0 && (
              <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                아직 메모가 없어요. 한 줄이라도 적어보세요!
              </p>
            )}

            {notes.map((note) => (
              <div key={note.id} className="note-item" style={{ borderLeftColor: note.academies?.color || '#7cc47c' }}>
                <div className="note-header">
                  <span className="note-academy-badge">{note.academies?.icon} {note.academies?.name || '기타'}</span>
                  <span className="note-date">{new Date(note.studied_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                  <span className="task-delete" onClick={() => { playSfx('cancel'); removeNote(note.id) }}>×</span>
                </div>
                <p className="note-title">{note.title}</p>
                {note.content && <p className="note-content">{note.content}</p>}
                <p className="note-review-info">
                  복습 {note.review_count || 0}회 | 다음 복습: {note.next_review ? new Date(note.next_review).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}
                </p>
              </div>
            ))}
          </section>
        </>
      )}

      {/* 습관 탭 */}
      {tab === '습관' && (
        <section className="card">
          <h2>🔥 오늘의 습관</h2>
          {showAddHabit ? (
            <div className="add-form">
              <div className="icon-picker">
                {HABIT_ICONS.map((icon) => (
                  <button key={icon} className={`icon-option${habitIcon === icon ? ' selected' : ''}`} onClick={() => setHabitIcon(icon)}>{icon}</button>
                ))}
              </div>
              <input type="text" className="schedule-input" placeholder="습관 이름 (예: 영어 단어 10개)" value={habitTitle} onChange={(e) => setHabitTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="nickname-btn" onClick={handleAddHabit} disabled={!habitTitle.trim()}>추가</button>
                <button className="nickname-btn" style={{ background: '#eee', color: '#666' }} onClick={() => setShowAddHabit(false)}>취소</button>
              </div>
            </div>
          ) : (
            <button className="add-btn" onClick={() => setShowAddHabit(true)}>+ 습관 추가</button>
          )}

          {habits.length === 0 && !showAddHabit && (
            <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
              매일 하고 싶은 습관을 추가해보세요!
            </p>
          )}

          {habits.map((habit) => {
            const isDone = todayLogs.includes(habit.id)
            const streak = streaks[habit.id] || 0
            return (
              <div key={habit.id} className={`habit-item${isDone ? ' done' : ''}`}>
                <div className="habit-check" onClick={() => { playSfx(isDone ? 'cancel' : 'confirm'); toggleHabit(habit.id) }}>
                  {isDone ? '✓' : ''}
                </div>
                <span className="habit-icon">{habit.icon}</span>
                <span className={`habit-title${isDone ? ' done' : ''}`}>{habit.title}</span>
                {streak > 0 && <span className="habit-streak">🔥 {streak}일</span>}
                <span className="task-delete" onClick={() => { playSfx('cancel'); removeHabit(habit.id) }}>×</span>
              </div>
            )
          })}

          {allDoneToday && habits.length > 0 && (
            <div className="habit-complete-msg">
              오늘 습관 전부 완료! 대단해! 🦆🎉
            </div>
          )}
        </section>
      )}

      {/* 목표 탭 */}
      {tab === '목표' && (
        <section className="card">
          <h2>🎯 내 목표</h2>
          {showAddGoal ? (
            <div className="add-form">
              <input type="text" className="schedule-input" placeholder="목표 (예: 영어 회화 자신감 키우기)" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} />
              <div>
                <span style={{ fontSize: '12px', color: '#888' }}>목표 기한 (선택)</span>
                <input type="date" className="schedule-input" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="nickname-btn" onClick={handleAddGoal} disabled={!goalTitle.trim()}>추가</button>
                <button className="nickname-btn" style={{ background: '#eee', color: '#666' }} onClick={() => setShowAddGoal(false)}>취소</button>
              </div>
            </div>
          ) : (
            <button className="add-btn" onClick={() => setShowAddGoal(true)}>+ 목표 추가</button>
          )}

          {goals.length === 0 && !showAddGoal && (
            <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
              이루고 싶은 목표를 추가해보세요!
            </p>
          )}

          {goals.map((goal) => (
            <div key={goal.id} className={`goal-item${goal.is_completed ? ' completed' : ''}`}>
              <div className="habit-check" onClick={() => { playSfx(goal.is_completed ? 'cancel' : 'celebrate'); toggleComplete(goal.id) }}>
                {goal.is_completed ? '✓' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <p className={`goal-title${goal.is_completed ? ' done' : ''}`}>{goal.title}</p>
                {goal.target_date && (
                  <p className="goal-date">기한: {new Date(goal.target_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                )}
              </div>
              <span className="task-delete" onClick={() => { playSfx('cancel'); removeGoal(goal.id) }}>×</span>
            </div>
          ))}
        </section>
      )}

      <BottomNav />
    </>
  )
}

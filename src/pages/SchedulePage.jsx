import { useState } from 'react'
import { useAcademies, useScheduleItems } from '../hooks/useSchedule'
import { useSound } from '../hooks/useSound'
import BottomNav from '../components/BottomNav'

const PRESET_ACADEMIES = [
  { name: '영어', icon: '🔤', color: '#d4860a' },
  { name: '드럼', icon: '🥁', color: '#c0397a' },
  { name: '사운드', icon: '🎧', color: '#7a3ac0' },
  { name: '필라테스', icon: '🧘', color: '#3a5fc0' },
  { name: '회사', icon: '💼', color: '#555555' },
  { name: '약속', icon: '🤝', color: '#2a9d8f' },
  { name: '개인', icon: '🙋', color: '#e76f51' },
]

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

const COLORS = ['#d4860a', '#c0397a', '#7a3ac0', '#3a5fc0', '#555555', '#7cc47c', '#e05555', '#2a9d8f', '#e76f51']
const ICONS = ['📚', '🔤', '🥁', '🎧', '🧘', '💼', '🤝', '🙋', '🎨', '🎵', '💻', '🏃', '🍽️', '💅', '🛌']

const HOURS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6
  return `${String(h).padStart(2, '0')}:00`
})

const HALF_HOURS = []
for (let h = 6; h <= 23; h++) {
  HALF_HOURS.push(`${String(h).padStart(2, '0')}:00`)
  HALF_HOURS.push(`${String(h).padStart(2, '0')}:30`)
}

function addHour(time) {
  const [h, m] = time.split(':').map(Number)
  const newH = Math.min(h + 1, 23)
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function SchedulePage() {
  const { academies, add: addAcademy, remove: removeAcademy } = useAcademies()
  const { items: scheduleItems, add: addItem, remove: removeItem, update: updateItem } = useScheduleItems()
  const { playSfx } = useSound()
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [showAddAcademy, setShowAddAcademy] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [newIcon, setNewIcon] = useState(ICONS[0])
  const [itemTitle, setItemTitle] = useState('')
  const [itemAcademy, setItemAcademy] = useState('')
  const [selectedDays, setSelectedDays] = useState([])
  const [itemStart, setItemStart] = useState('09:00')
  const [itemEnd, setItemEnd] = useState('10:00')

  const handleAddAcademy = async () => {
    if (!newName.trim()) return
    playSfx('add')
    await addAcademy(newName.trim(), newColor, newIcon)
    setNewName('')
    setShowAddAcademy(false)
  }

  const handlePreset = async (preset) => {
    const exists = academies.find((a) => a.name === preset.name)
    if (exists) return
    playSfx('click')
    await addAcademy(preset.name, preset.color, preset.icon)
  }

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleStartChange = (val) => {
    setItemStart(val)
    setItemEnd(addHour(val))
  }

  const handleAddItem = async () => {
    if (!itemTitle.trim() || !itemAcademy || selectedDays.length === 0) return
    playSfx('add')
    for (const day of selectedDays) {
      await addItem({
        title: itemTitle.trim(),
        academy_id: itemAcademy,
        day_of_week: day,
        start_time: itemStart,
        end_time: itemEnd || null,
      })
    }
    setItemTitle('')
    setSelectedDays([])
    setShowAddItem(false)
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditTitle(item.title)
    setEditStart(item.start_time?.slice(0, 5) || '09:00')
    setEditEnd(item.end_time?.slice(0, 5) || '10:00')
  }

  const saveEdit = async () => {
    if (!editTitle.trim()) return
    playSfx('confirm')
    await updateItem(editingId, {
      title: editTitle.trim(),
      start_time: editStart,
      end_time: editEnd,
    })
    setEditingId(null)
  }

  // 이번 주 날짜 계산
  const getWeekRange = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`
    return {
      label: `${now.getFullYear()}년 ${fmt(monday)} ~ ${fmt(sunday)}`,
      dates: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        return { dayIndex: d.getDay(), date: d.getDate(), isToday: d.toDateString() === now.toDateString() }
      }),
    }
  }
  const week = getWeekRange()

  const unusedPresets = PRESET_ACADEMIES.filter(
    (p) => !academies.find((a) => a.name === p.name)
  )

  const itemsByDay = {}
  for (const item of scheduleItems) {
    if (!itemsByDay[item.day_of_week]) itemsByDay[item.day_of_week] = []
    itemsByDay[item.day_of_week].push(item)
  }

  return (
    <>
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>📅 일정 관리</h2>
      </div>

      {/* 학원/활동 목록 */}
      <section className="card">
        <h2>내 활동</h2>
        <div className="academy-list">
          {academies.map((a) => (
            <div key={a.id} className="academy-chip" style={{ borderColor: a.color }}>
              <span>{a.icon} {a.name}</span>
              <span className="academy-delete" onClick={() => removeAcademy(a.id)}>×</span>
            </div>
          ))}
        </div>

        {unusedPresets.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>빠른 추가:</p>
            <div className="academy-list">
              {unusedPresets.map((p) => (
                <button key={p.name} className="preset-btn" onClick={() => handlePreset(p)}>
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {showAddAcademy ? (
          <div className="add-form">
            <div className="icon-picker">
              {ICONS.map((icon) => (
                <button key={icon} className={`icon-option${newIcon === icon ? ' selected' : ''}`} onClick={() => setNewIcon(icon)}>{icon}</button>
              ))}
            </div>
            <div className="color-picker">
              {COLORS.map((c) => (
                <button key={c} className={`color-dot${newColor === c ? ' selected' : ''}`} style={{ background: c }} onClick={() => setNewColor(c)} />
              ))}
            </div>
            <div className="task-input-row">
              <input type="text" placeholder="활동 이름 (예: 수영)" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddAcademy()} />
              <button onClick={handleAddAcademy}>추가</button>
            </div>
          </div>
        ) : (
          <button className="add-btn" onClick={() => setShowAddAcademy(true)}>+ 직접 추가</button>
        )}
      </section>

      {/* 일정 추가 */}
      <section className="card">
        <div className="week-header">
          <h2>주간 일정</h2>
          <span className="week-range">{week.label}</span>
        </div>

        {/* 이번 주 미니 캘린더 */}
        <div className="mini-week">
          {week.dates.map((d, i) => {
            const dayOrder = [1, 2, 3, 4, 5, 6, 0]
            const dayIdx = dayOrder[i]
            return (
              <div key={i} className={`mini-day${d.isToday ? ' today' : ''}`}>
                <span className="mini-day-name">{DAYS[dayIdx]}</span>
                <span className="mini-day-date">{d.date}</span>
                {itemsByDay[dayIdx] && <span className="mini-day-dot" />}
              </div>
            )
          })}
        </div>

        {showAddItem ? (
          <div className="add-form">
            <select className="schedule-select" value={itemAcademy} onChange={(e) => setItemAcademy(e.target.value)}>
              <option value="">활동 선택</option>
              {academies.map((a) => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>

            <input type="text" className="schedule-input" placeholder="일정 이름 (예: 영어 회화 수업)" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />

            <p style={{ fontSize: '12px', color: '#888', marginBottom: '-4px' }}>요일 (여러 개 선택 가능)</p>
            <div className="day-picker">
              {DAYS.map((d, i) => (
                <button key={i} className={`day-btn${selectedDays.includes(i) ? ' selected' : ''}`} onClick={() => toggleDay(i)}>{d}</button>
              ))}
            </div>

            <div className="time-row">
              <label>
                <span>시작</span>
                <select className="time-select" value={itemStart} onChange={(e) => handleStartChange(e.target.value)}>
                  {HALF_HOURS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>종료</span>
                <select className="time-select" value={itemEnd} onChange={(e) => setItemEnd(e.target.value)}>
                  {HALF_HOURS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="nickname-btn" onClick={handleAddItem} disabled={!itemTitle.trim() || !itemAcademy || selectedDays.length === 0}>일정 추가</button>
              <button className="nickname-btn" style={{ background: '#eee', color: '#666' }} onClick={() => setShowAddItem(false)}>취소</button>
            </div>
          </div>
        ) : (
          <button className="add-btn" onClick={() => setShowAddItem(true)}>+ 일정 추가</button>
        )}

        {/* 요일별 일정 */}
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const dayItems = itemsByDay[day]
          if (!dayItems || dayItems.length === 0) return null
          return (
            <div key={day} className="day-section">
              <h3 className="day-section-title">{DAYS[day]}요일</h3>
              {dayItems.map((item) => (
                editingId === item.id ? (
                  <div key={item.id} className="schedule-edit-form">
                    <input type="text" className="schedule-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    <div className="time-row">
                      <label>
                        <span>시작</span>
                        <select className="time-select" value={editStart} onChange={(e) => { setEditStart(e.target.value); setEditEnd(addHour(e.target.value)) }}>
                          {HALF_HOURS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>종료</span>
                        <select className="time-select" value={editEnd} onChange={(e) => setEditEnd(e.target.value)}>
                          {HALF_HOURS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="edit-save-btn" onClick={saveEdit}>저장</button>
                      <button className="edit-cancel-btn" onClick={() => setEditingId(null)}>취소</button>
                    </div>
                  </div>
                ) : (
                  <div key={item.id} className="schedule-item" style={{ borderLeftColor: item.academies?.color || '#7cc47c' }} onClick={() => startEdit(item)}>
                    <div className="schedule-item-time">
                      {item.start_time?.slice(0, 5)}
                      {item.end_time && ` ~ ${item.end_time.slice(0, 5)}`}
                    </div>
                    <div className="schedule-item-title">
                      {item.academies?.icon} {item.title}
                    </div>
                    <span className="task-delete" onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}>×</span>
                  </div>
                )
              ))}
            </div>
          )
        })}

        {scheduleItems.length === 0 && (
          <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
            아직 등록된 일정이 없어요. 위에서 추가해보세요!
          </p>
        )}
      </section>

      <BottomNav />
    </>
  )
}

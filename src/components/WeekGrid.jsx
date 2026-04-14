import { WEEK_TAGS } from '../data/scheduleData'

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일']

export default function WeekGrid({ todayName }) {
  return (
    <section className="card">
      <h2>🗓️ 이번 주</h2>
      <div className="week-grid">
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className={`day-box${todayName === day ? ' today' : ''}`}
            id={`day-${day}`}
          >
            <span className="day-label">{day}</span>
            <div className="day-items">
              {(WEEK_TAGS[day] || []).map((tag, i) => (
                <span key={i} className={`tag ${tag.cls}`}>{tag.label}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

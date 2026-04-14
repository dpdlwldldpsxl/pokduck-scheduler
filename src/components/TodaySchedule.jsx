import { FIXED_SCHEDULE, POKDUCK_IMAGES } from '../data/scheduleData'

export default function TodaySchedule({ dayName }) {
  const items = FIXED_SCHEDULE[dayName] || []

  return (
    <section className="card">
      <div className="card-title-row">
        <img src={POKDUCK_IMAGES.default} alt="폭덕이" className="card-profile-img" />
        <h2>📅 오늘 일정</h2>
      </div>
      <ul id="today-schedule" className="schedule-list">
        {items.length === 0 ? (
          <li className="schedule-empty">일정 없음</li>
        ) : (
          items.map((item, i) => (
            <li key={i}>
              <span className="schedule-time">{item.time}</span>
              <span>{item.text}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}

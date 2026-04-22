import { useState } from 'react'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6~23
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

export default function TimePicker({ value, onChange, label }) {
  const [h, m] = (value || '09:00').split(':').map(Number)

  const setHour = (newH) => {
    onChange(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  const setMinute = (newM) => {
    onChange(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`)
  }

  return (
    <div className="time-picker">
      {label && <span className="time-picker-label">{label}</span>}
      <div className="time-picker-row">
        <div className="time-picker-col">
          <div className="time-picker-grid hours">
            {HOURS.map((hr) => (
              <button
                key={hr}
                className={`time-picker-btn${h === hr ? ' selected' : ''}`}
                onClick={() => setHour(hr)}
              >
                {hr}
              </button>
            ))}
          </div>
          <span className="time-picker-unit">시</span>
        </div>
        <span className="time-picker-colon">:</span>
        <div className="time-picker-col">
          <div className="time-picker-grid minutes">
            {MINUTES.map((min) => (
              <button
                key={min}
                className={`time-picker-btn${m === min ? ' selected' : ''}`}
                onClick={() => setMinute(min)}
              >
                {String(min).padStart(2, '0')}
              </button>
            ))}
          </div>
          <span className="time-picker-unit">분</span>
        </div>
      </div>
      <div className="time-picker-display">{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</div>
    </div>
  )
}

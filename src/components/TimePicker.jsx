import { useState, useRef, useEffect } from 'react'

export default function TimePicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState('am') // am | pm
  const ref = useRef()

  const [h, m] = (value || '09:00').split(':').map(Number)

  useEffect(() => {
    setPeriod(h >= 12 ? 'pm' : 'am')
  }, [value])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const amHours = [6, 7, 8, 9, 10, 11]
  const pmHours = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
  const hours = period === 'am' ? amHours : pmHours
  const minutes = [0, 15, 30, 45]

  const displayTime = () => {
    const p = h >= 12 ? '오후' : '오전'
    const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${p} ${dh}:${String(m).padStart(2, '0')}`
  }

  const selectHour = (newH) => {
    onChange(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  const selectMinute = (newM) => {
    onChange(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`)
  }

  const displayHour = (hr) => hr > 12 ? hr - 12 : hr === 0 ? 12 : hr

  return (
    <div className="tp-container" ref={ref}>
      {label && <span className="tp-label">{label}</span>}
      <button className="tp-button" onClick={() => setOpen(!open)} type="button">
        {displayTime()}
        <span className="tp-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="tp-popup">
          <div className="tp-period-tabs">
            <button className={`tp-period${period === 'am' ? ' active' : ''}`} onClick={() => setPeriod('am')}>오전</button>
            <button className={`tp-period${period === 'pm' ? ' active' : ''}`} onClick={() => setPeriod('pm')}>오후</button>
          </div>
          <div className="tp-selectors">
            <div className="tp-col">
              <span className="tp-col-label">시</span>
              <div className="tp-grid">
                {hours.map((hr) => (
                  <button key={hr} className={`tp-cell${h === hr ? ' active' : ''}`} onClick={() => selectHour(hr)}>
                    {displayHour(hr)}
                  </button>
                ))}
              </div>
            </div>
            <div className="tp-col">
              <span className="tp-col-label">분</span>
              <div className="tp-grid">
                {minutes.map((min) => (
                  <button key={min} className={`tp-cell${m === min ? ' active' : ''}`} onClick={() => selectMinute(min)}>
                    {String(min).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

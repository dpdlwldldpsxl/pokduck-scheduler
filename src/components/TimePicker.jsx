import { useState, useRef, useEffect } from 'react'

const OPTIONS = []
for (let h = 6; h <= 23; h++) {
  for (const m of [0, 15, 30, 45]) {
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const period = h < 12 ? '오전' : '오후'
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
    const label = `${period} ${displayH}:${String(m).padStart(2, '0')}`
    OPTIONS.push({ value: time, label })
  }
}

export default function TimePicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const listRef = useRef()

  const current = OPTIONS.find((o) => o.value === value) || OPTIONS[0]

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open && listRef.current) {
      const selected = listRef.current.querySelector('.tp-selected')
      if (selected) selected.scrollIntoView({ block: 'center' })
    }
  }, [open])

  const handleSelect = (val) => {
    onChange(val)
    setOpen(false)
  }

  return (
    <div className="tp-container" ref={ref}>
      {label && <span className="tp-label">{label}</span>}
      <button className="tp-button" onClick={() => setOpen(!open)}>
        {current.label}
        <span className="tp-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="tp-dropdown" ref={listRef}>
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`tp-option${o.value === value ? ' tp-selected' : ''}`}
              onClick={() => handleSelect(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

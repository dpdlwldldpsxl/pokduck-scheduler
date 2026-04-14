import { useState, useEffect } from 'react'
import { POKDUCK_IMAGES } from '../data/scheduleData'

export default function Header({ mood, dateStr }) {
  const [imgSrc, setImgSrc] = useState(POKDUCK_IMAGES.default)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    const targetSrc = POKDUCK_IMAGES[mood] || POKDUCK_IMAGES.default
    if (targetSrc === imgSrc) return

    const testImg = new Image()
    testImg.onload = () => {
      setSwitching(true)
      setTimeout(() => {
        setImgSrc(targetSrc)
        setSwitching(false)
      }, 150)
    }
    testImg.src = targetSrc
  }, [mood])

  return (
    <header>
      <div className="header-inner">
        <img
          src={imgSrc}
          alt="폭덕이"
          className={`header-duck${switching ? ' duck-switch' : ''}`}
          id="pokduck-img"
        />
        <div className="header-text">
          <h1>폭덕이의 스케줄러</h1>
          <p>{dateStr}</p>
        </div>
      </div>
    </header>
  )
}

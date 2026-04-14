import { useState, useEffect, useRef } from 'react'

export default function IntroOverlay({ onClose }) {
  const [fading, setFading] = useState(false)
  const videoRef = useRef()

  const handleClose = () => {
    if (fading) return
    setFading(true)
    setTimeout(onClose, 500)
  }

  useEffect(() => {
    const video = videoRef.current
    video.addEventListener('ended', handleClose)
    video.addEventListener('error', handleClose)
    video.play().catch(() => {})

    const timer = setTimeout(() => {
      if (video.readyState === 0) handleClose()
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      id="intro-overlay"
      className={fading ? 'fade-out' : ''}
      onClick={handleClose}
    >
      <video ref={videoRef} id="intro-video" playsInline muted>
        <source src="/images/pokduck_greeting.mp4" type="video/mp4" />
      </video>
      <p className="intro-title">폭덕이와 같이 스케줄짜기</p>
      <button
        className="intro-skip-btn"
        onClick={(e) => { e.stopPropagation(); handleClose() }}
      >
        시작하기 🦆
      </button>
    </div>
  )
}

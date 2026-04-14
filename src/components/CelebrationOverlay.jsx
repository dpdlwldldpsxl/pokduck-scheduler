import { useRef } from 'react'

export default function CelebrationOverlay({ onClose }) {
  const videoRef = useRef()

  const handleClose = () => {
    if (videoRef.current) videoRef.current.pause()
    onClose()
  }

  return (
    <div id="celebrate-overlay">
      <video
        ref={videoRef}
        id="celebrate-video"
        playsInline
        muted
        loop
        autoPlay
        onError={(e) => { e.target.style.display = 'none' }}
      >
        <source src="/images/pokduck_celebrate.mp4" type="video/mp4" />
      </video>
      <p className="celebrate-msg">오늘 할 일 전부 완료!!! 🎉</p>
      <button className="celebrate-close" onClick={handleClose}>
        폭덕이 고마워!
      </button>
    </div>
  )
}

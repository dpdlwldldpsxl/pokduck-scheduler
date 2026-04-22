import { useRef, useEffect, useState, createContext, useContext } from 'react'

const SoundContext = createContext(null)

// BGM별 볼륨 배수 (여기서 조절)
const BGM_VOLUMES = {
  intro: 0.15,  // 인트로: 작게
  main: 0.45,   // 메인: 크게
}

export function SoundProvider({ children }) {
  const bgmRef = useRef(null)
  const pendingBgmRef = useRef(null)
  const [bgmType, setBgmType] = useState(null)
  const [bgmEnabled, setBgmEnabled] = useState(true)
  const [sfxEnabled, setSfxEnabled] = useState(true)
  const [sfxVolume, setSfxVolume] = useState(0.5)
  const [userInteracted, setUserInteracted] = useState(false)

  // 유저 첫 인터랙션 감지 (브라우저 자동재생 정책)
  useEffect(() => {
    const handleInteraction = () => setUserInteracted(true)
    const events = ['click', 'touchstart', 'keydown']
    events.forEach((e) => window.addEventListener(e, handleInteraction, { once: true }))
    return () => events.forEach((e) => window.removeEventListener(e, handleInteraction))
  }, [])

  const playBgm = (type) => {
    if (bgmType === type && bgmRef.current && !bgmRef.current.paused) return

    // 이전 BGM 정지
    if (bgmRef.current) {
      bgmRef.current.pause()
      bgmRef.current = null
    }

    const src = type === 'intro' ? '/sounds/intro-bgm.wav' : '/sounds/main-bgm.wav'
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = BGM_VOLUMES[type] || 0.3
    bgmRef.current = audio
    setBgmType(type)

    if (bgmEnabled && userInteracted) {
      audio.play().catch(() => {})
    } else {
      // 아직 인터랙션 전이면 대기
      pendingBgmRef.current = type
    }
  }

  const stopBgm = () => {
    if (bgmRef.current) {
      bgmRef.current.pause()
      bgmRef.current = null
    }
    setBgmType(null)
    pendingBgmRef.current = null
  }

  // 유저 인터랙션 감지되면 대기 중이던 BGM 바로 재생
  useEffect(() => {
    if (userInteracted && bgmEnabled && bgmRef.current && bgmRef.current.paused) {
      bgmRef.current.play().catch(() => {})
    }
  }, [userInteracted])

  // BGM 켜기/끄기
  useEffect(() => {
    if (!bgmRef.current) return
    if (bgmEnabled && userInteracted) {
      bgmRef.current.play().catch(() => {})
    } else {
      bgmRef.current.pause()
    }
  }, [bgmEnabled])

  const playSfx = (name) => {
    if (!sfxEnabled) return
    const audio = new Audio(`/sounds/${name}.wav`)
    audio.volume = sfxVolume
    audio.play().catch(() => {})
  }

  return (
    <SoundContext.Provider value={{
      playBgm, stopBgm,
      bgmEnabled, setBgmEnabled,
      sfxEnabled, setSfxEnabled,
      sfxVolume, setSfxVolume,
      playSfx,
    }}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const context = useContext(SoundContext)
  if (!context) throw new Error('useSound must be used within SoundProvider')
  return context
}

import { useRef, useEffect, useState, createContext, useContext } from 'react'

const SoundContext = createContext(null)

const BGM_VOLUMES = {
  intro: 0.15,
  main: 0.55,
}

export function SoundProvider({ children }) {
  const bgmRef = useRef(null)
  const bgmTypeRef = useRef(null)
  const [bgmEnabled, setBgmEnabled] = useState(() => localStorage.getItem('pokduck-bgm') !== 'off')
  const [sfxEnabled, setSfxEnabled] = useState(() => localStorage.getItem('pokduck-sfx') !== 'off')
  const [sfxVolume] = useState(0.5)

  // 설정 저장
  useEffect(() => { localStorage.setItem('pokduck-bgm', bgmEnabled ? 'on' : 'off') }, [bgmEnabled])
  useEffect(() => { localStorage.setItem('pokduck-sfx', sfxEnabled ? 'on' : 'off') }, [sfxEnabled])

  const playBgm = (type) => {
    if (bgmTypeRef.current === type && bgmRef.current && !bgmRef.current.paused) return

    if (bgmRef.current) {
      bgmRef.current.pause()
      bgmRef.current = null
    }

    const src = type === 'intro' ? '/sounds/intro-bgm.wav' : '/sounds/main-bgm.wav'
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = BGM_VOLUMES[type] || 0.3
    bgmRef.current = audio
    bgmTypeRef.current = type

    if (bgmEnabled) {
      const tryPlay = () => {
        audio.play().catch(() => {
          // 자동재생 차단 시 클릭하면 재생
          const retry = () => {
            audio.play().catch(() => {})
            document.removeEventListener('click', retry)
            document.removeEventListener('touchstart', retry)
          }
          document.addEventListener('click', retry, { once: true })
          document.addEventListener('touchstart', retry, { once: true })
        })
      }
      tryPlay()
    }
  }

  const stopBgm = () => {
    if (bgmRef.current) {
      bgmRef.current.pause()
      bgmRef.current = null
    }
    bgmTypeRef.current = null
  }

  // BGM 토글
  const toggleBgm = () => {
    const next = !bgmEnabled
    setBgmEnabled(next)
    if (bgmRef.current) {
      if (next) {
        bgmRef.current.play().catch(() => {})
      } else {
        bgmRef.current.pause()
      }
    }
  }

  const toggleSfx = () => {
    setSfxEnabled((prev) => !prev)
  }

  const SFX_VOLUMES = { add: 0.4, cancel: 0.4 }

  const playSfx = (name) => {
    if (!sfxEnabled) return
    const audio = new Audio(`/sounds/${name}.wav`)
    audio.volume = SFX_VOLUMES[name] || sfxVolume
    audio.play().catch(() => {})
  }

  return (
    <SoundContext.Provider value={{
      playBgm, stopBgm,
      bgmEnabled, toggleBgm,
      sfxEnabled, toggleSfx,
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

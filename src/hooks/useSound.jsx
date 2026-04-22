import { useRef, useEffect, useState, createContext, useContext } from 'react'

const SoundContext = createContext(null)

const BGM_VOLUMES = {
  intro: 0.15,
  main: 0.55,
}

const SFX_VOLUMES = {
  add: 0.4,
  cancel: 0.3,
}

export function SoundProvider({ children }) {
  const bgmRef = useRef(null)
  const bgmTypeRef = useRef(null)
  const retryCleanupRef = useRef(null)
  const [bgmEnabled, setBgmEnabled] = useState(() => localStorage.getItem('pokduck-bgm') !== 'off')
  const [sfxEnabled, setSfxEnabled] = useState(() => localStorage.getItem('pokduck-sfx') !== 'off')

  useEffect(() => { localStorage.setItem('pokduck-bgm', bgmEnabled ? 'on' : 'off') }, [bgmEnabled])
  useEffect(() => { localStorage.setItem('pokduck-sfx', sfxEnabled ? 'on' : 'off') }, [sfxEnabled])

  // 이전 retry 리스너 정리
  const cleanupRetry = () => {
    if (retryCleanupRef.current) {
      retryCleanupRef.current()
      retryCleanupRef.current = null
    }
  }

  const playBgm = (type) => {
    // 같은 타입이고 재생 중이면 무시
    if (bgmTypeRef.current === type && bgmRef.current && !bgmRef.current.paused) return

    // 같은 타입이고 일시정지면 이어서 재생
    if (bgmTypeRef.current === type && bgmRef.current) {
      if (bgmEnabled) bgmRef.current.play().catch(() => {})
      return
    }

    // 이전 BGM 정리
    cleanupRetry()
    if (bgmRef.current) {
      bgmRef.current.pause()
      bgmRef.current.src = ''
      bgmRef.current = null
    }

    const src = type === 'intro' ? '/sounds/intro-bgm.wav' : '/sounds/main-bgm.wav'
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = BGM_VOLUMES[type] || 0.3
    bgmRef.current = audio
    bgmTypeRef.current = type

    if (!bgmEnabled) return

    audio.play().catch(() => {
      // 자동재생 차단 시 첫 클릭에 재생
      const retry = () => {
        if (bgmRef.current === audio && bgmEnabled) {
          audio.play().catch(() => {})
        }
        document.removeEventListener('click', retry)
        document.removeEventListener('touchstart', retry)
        retryCleanupRef.current = null
      }
      document.addEventListener('click', retry, { once: true })
      document.addEventListener('touchstart', retry, { once: true })
      retryCleanupRef.current = () => {
        document.removeEventListener('click', retry)
        document.removeEventListener('touchstart', retry)
      }
    })
  }

  const stopBgm = () => {
    cleanupRetry()
    if (bgmRef.current) {
      bgmRef.current.pause()
      bgmRef.current.src = ''
      bgmRef.current = null
    }
    bgmTypeRef.current = null
  }

  const toggleBgm = () => {
    const next = !bgmEnabled
    setBgmEnabled(next)
    if (!next && bgmRef.current) {
      bgmRef.current.pause()
    } else if (next && bgmRef.current) {
      bgmRef.current.play().catch(() => {})
    }
  }

  const toggleSfx = () => {
    setSfxEnabled((prev) => !prev)
  }

  const playSfx = (name) => {
    if (!sfxEnabled) return
    const audio = new Audio(`/sounds/${name}.wav`)
    audio.volume = SFX_VOLUMES[name] || 0.5
    audio.play().catch(() => {})
  }

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanupRetry()
      if (bgmRef.current) {
        bgmRef.current.pause()
        bgmRef.current.src = ''
      }
    }
  }, [])

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

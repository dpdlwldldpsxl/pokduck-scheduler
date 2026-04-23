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

// Layer 2: 앰비언트 (공간감 배경음 + 집중 음악). MP3 포맷, 모두 루프.
// 자연(rain/beach/forest/fire) — 복기/쉼
// 음악(lofi/piano) — 집중/기분 전환
// lofi 슬롯은 2개 파일 랜덤 재생 (같은 분위기 반복 방지)
const AMBIENCE_FILES = {
  rain: ['rain.mp3'],
  beach: ['beach.mp3'],
  forest: ['forest.mp3'],
  fire: ['fire.mp3'],
  lofi: ['lofi.mp3', 'beats.mp3'], // 로파이 2곡 — 호출할 때마다 랜덤
  piano: ['piano.mp3'],
  hiphop: ['hiphop.mp3'],
  edm: ['future.mp3', 'edm.mp3'], // Future Bass + EDM — 랜덤
}
export const AMBIENCE_TRACKS = Object.keys(AMBIENCE_FILES)
const AMBIENCE_VOLUME = 0.45
const AMBIENCE_PATH = (name) => {
  const files = AMBIENCE_FILES[name]
  if (!files || files.length === 0) return `/sounds/${name}.mp3`
  const pick = files[Math.floor(Math.random() * files.length)]
  return `/sounds/${pick}`
}
const FADE_MS = 700

// setInterval 기반 선형 페이드
function fadeTo(audio, target, duration, onDone) {
  if (!audio) return
  const start = audio.volume
  const steps = 20
  const delta = (target - start) / steps
  const intervalMs = duration / steps
  let i = 0
  const t = setInterval(() => {
    i++
    const v = start + delta * i
    audio.volume = Math.max(0, Math.min(1, v))
    if (i >= steps) {
      clearInterval(t)
      audio.volume = target
      onDone?.()
    }
  }, intervalMs)
  return t
}

export function SoundProvider({ children }) {
  const bgmRef = useRef(null)
  const bgmTypeRef = useRef(null)
  const retryCleanupRef = useRef(null)

  // 앰비언트 상태
  const ambRef = useRef(null)
  const ambTypeRef = useRef(null)
  const ambFadeRef = useRef(null) // 진행 중인 fade interval

  const [bgmEnabled, setBgmEnabled] = useState(() => localStorage.getItem('pokduck-bgm') !== 'off')
  const [sfxEnabled, setSfxEnabled] = useState(() => localStorage.getItem('pokduck-sfx') !== 'off')
  const [ambienceType, setAmbienceType] = useState(null) // UI 노출용

  useEffect(() => { localStorage.setItem('pokduck-bgm', bgmEnabled ? 'on' : 'off') }, [bgmEnabled])
  useEffect(() => { localStorage.setItem('pokduck-sfx', sfxEnabled ? 'on' : 'off') }, [sfxEnabled])

  // 이전 retry 리스너 정리
  const cleanupRetry = () => {
    if (retryCleanupRef.current) {
      retryCleanupRef.current()
      retryCleanupRef.current = null
    }
  }

  const clearAmbFade = () => {
    if (ambFadeRef.current) {
      clearInterval(ambFadeRef.current)
      ambFadeRef.current = null
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

    // 앰비언트 재생 중이면 BGM을 mute 상태로 준비 (ambience가 우선)
    if (ambRef.current) audio.volume = 0

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
    // BGM 객체 제어
    if (!next && bgmRef.current) {
      bgmRef.current.pause()
    } else if (next && bgmRef.current && !ambRef.current) {
      // 앰비언트 없을 때만 BGM 재생
      bgmRef.current.play().catch(() => {})
    }
    // 앰비언트도 함께 토글 (같은 "소리" 스위치)
    if (!next && ambRef.current) {
      ambRef.current.pause()
    } else if (next && ambRef.current) {
      ambRef.current.play().catch(() => {})
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

  // ─── 앰비언트 Layer 2 ─────────────────────────────

  // 앰비언트 재생 — BGM은 fade out, 앰비언트 fade in
  const playAmbience = (type) => {
    if (!AMBIENCE_TRACKS.includes(type)) return
    // 이미 같은 걸 재생 중이면 무시
    if (ambTypeRef.current === type && ambRef.current && !ambRef.current.paused) return

    clearAmbFade()

    // 이전 앰비언트가 있으면 crossfade (기존 out, 새거 in)
    const old = ambRef.current
    const audio = new Audio(AMBIENCE_PATH(type))
    audio.loop = true
    audio.volume = 0
    ambRef.current = audio
    ambTypeRef.current = type
    setAmbienceType(type)

    if (!bgmEnabled) return // 소리 OFF 상태면 준비만 하고 재생 X

    audio.play().catch(() => {
      // 자동재생 차단 시 첫 클릭에 재생
      const retry = () => {
        if (ambRef.current === audio && bgmEnabled) {
          audio.play().catch(() => {})
          fadeTo(audio, AMBIENCE_VOLUME, FADE_MS)
        }
        document.removeEventListener('click', retry)
        document.removeEventListener('touchstart', retry)
      }
      document.addEventListener('click', retry, { once: true })
      document.addEventListener('touchstart', retry, { once: true })
    })

    // BGM 볼륨 0으로 fade (소리 끄기는 아니고 mute — 나갈 때 복귀)
    if (bgmRef.current) {
      fadeTo(bgmRef.current, 0, FADE_MS)
    }

    // 이전 앰비언트 fade out 후 정리
    if (old) {
      fadeTo(old, 0, FADE_MS, () => {
        old.pause()
        old.src = ''
      })
    }

    // 새 앰비언트 fade in
    ambFadeRef.current = fadeTo(audio, AMBIENCE_VOLUME, FADE_MS)
  }

  // 앰비언트 정지 — BGM은 fade in 복귀
  const stopAmbience = () => {
    clearAmbFade()
    const old = ambRef.current
    ambRef.current = null
    ambTypeRef.current = null
    setAmbienceType(null)

    if (old) {
      fadeTo(old, 0, FADE_MS, () => {
        old.pause()
        old.src = ''
      })
    }

    // BGM 볼륨 복귀
    if (bgmRef.current && bgmEnabled) {
      const targetVol = BGM_VOLUMES[bgmTypeRef.current] || 0.3
      fadeTo(bgmRef.current, targetVol, FADE_MS)
      // 혹시 일시정지 상태면 재생
      if (bgmRef.current.paused) bgmRef.current.play().catch(() => {})
    }
  }

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanupRetry()
      clearAmbFade()
      if (bgmRef.current) {
        bgmRef.current.pause()
        bgmRef.current.src = ''
      }
      if (ambRef.current) {
        ambRef.current.pause()
        ambRef.current.src = ''
      }
    }
  }, [])

  return (
    <SoundContext.Provider value={{
      playBgm, stopBgm,
      bgmEnabled, toggleBgm,
      sfxEnabled, toggleSfx,
      playSfx,
      playAmbience, stopAmbience, ambienceType,
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

import { useSound } from '../hooks/useSound'

export default function SoundToggle() {
  const { bgmEnabled, toggleBgm, sfxEnabled, toggleSfx } = useSound()

  return (
    <div className="sound-toggle">
      <button
        className={`sound-toggle-btn${bgmEnabled ? ' on' : ''}`}
        onClick={toggleBgm}
        title={bgmEnabled ? 'BGM 끄기' : 'BGM 켜기'}
      >
        {bgmEnabled ? '🎵' : '🔇'}
      </button>
      <button
        className={`sound-toggle-btn${sfxEnabled ? ' on' : ''}`}
        onClick={toggleSfx}
        title={sfxEnabled ? '효과음 끄기' : '효과음 켜기'}
      >
        {sfxEnabled ? '🔊' : '🔈'}
      </button>
    </div>
  )
}

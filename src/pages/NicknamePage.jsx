import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function NicknamePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!nickname.trim() || saving) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ display_name: nickname.trim() })
      .eq('id', user.id)
    navigate('/today', { replace: true })
  }

  return (
    <div className="login-page">
      <div className="login-header">
        <img src="/images/pokduck_default.png" alt="폭덕이" className="login-duck" />
        <h1>반가워요!</h1>
        <p>폭덕이가 뭐라고 부를까요?</p>
      </div>
      <div className="login-card">
        <input
          type="text"
          className="nickname-input"
          placeholder="닉네임 입력 (예: 민희)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          maxLength={20}
          autoFocus
        />
        <button
          className="nickname-btn"
          onClick={handleSubmit}
          disabled={!nickname.trim() || saving}
        >
          {saving ? '저장 중...' : '시작하기 🦆'}
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useConversations, useMessages } from '../hooks/useCoaching'
import { useSound } from '../hooks/useSound'
import CoachingSurvey from '../components/CoachingSurvey'
import BottomNav from '../components/BottomNav'

const TYPES = [
  { key: 'general', label: '자유 대화', icon: '💬' },
  { key: 'schedule', label: '일정 상담', icon: '📅' },
  { key: 'mental', label: '멘탈 케어', icon: '💚' },
  { key: 'study', label: '학습 조언', icon: '📚' },
]

function formatMessage(text) {
  // **굵게** → <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function CoachingPage() {
  const { user } = useAuth()
  const { conversations, create, remove } = useConversations()
  const [activeConv, setActiveConv] = useState(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [hasSurvey, setHasSurvey] = useState(null)
  const { messages, addLocal, replaceLastAssistant, reload: reloadMessages } = useMessages(activeConv?.id)
  const { playSfx } = useSound()

  useEffect(() => {
    const checkSurvey = async () => {
      const { data } = await supabase
        .from('user_profile_survey')
        .select('id')
        .eq('user_id', user.id)
        .single()
      setHasSurvey(!!data)
    }
    checkSurvey()
  }, [user])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewConversation = async (type) => {
    playSfx('click')
    const conv = await create(type)
    if (conv) setActiveConv(conv)
  }

  const handleSend = async () => {
    if (!input.trim() || sending || !activeConv) return
    const text = input.trim()
    setInput('')
    setSending(true)
    playSfx('click')

    addLocal('user', text)
    addLocal('assistant', '폭덕이가 생각하는 중... 🦆')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationId: activeConv.id,
          message: text,
          conversationType: activeConv.conversation_type,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      replaceLastAssistant(data.content)
      playSfx('confirm')
    } catch (err) {
      replaceLastAssistant('미안, 지금 잠시 문제가 있어... 다시 시도해줘! 🦆')
    } finally {
      setSending(false)
    }
  }

  const handleBack = () => {
    setActiveConv(null)
  }

  // 온보딩 설문
  if (hasSurvey === false) {
    return <CoachingSurvey onComplete={() => setHasSurvey(true)} />
  }

  if (hasSurvey === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <p style={{ color: '#7cc47c' }}>로딩 중...</p>
    </div>
  }

  // 대화 목록 화면
  if (!activeConv) {
    return (
      <>
        <div style={{ padding: '20px 16px 0' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>🤖 AI 코칭</h2>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>폭덕이에게 뭐든 물어봐!</p>
        </div>

        <section className="card">
          <h2>새 대화 시작</h2>
          <div className="coaching-types">
            {TYPES.map((t) => (
              <button key={t.key} className="coaching-type-btn" onClick={() => handleNewConversation(t.key)}>
                <span className="coaching-type-icon">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {conversations.length > 0 && (
          <section className="card">
            <h2>이전 대화</h2>
            <div className="conv-list">
              {conversations.map((c) => (
                <div key={c.id} className="conv-item" onClick={() => { playSfx('click'); setActiveConv(c) }}>
                  <div className="conv-item-left">
                    <span className="conv-item-icon">
                      {TYPES.find((t) => t.key === c.conversation_type)?.icon || '💬'}
                    </span>
                    <div>
                      <p className="conv-item-title">{c.title}</p>
                      <p className="conv-item-date">
                        {new Date(c.updated_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className="task-delete" onClick={(e) => { e.stopPropagation(); remove(c.id) }}>×</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <BottomNav />
      </>
    )
  }

  // 채팅 화면
  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="chat-back" onClick={handleBack}>←</button>
        <div>
          <p className="chat-header-title">
            {TYPES.find((t) => t.key === activeConv.conversation_type)?.icon} {activeConv.title}
          </p>
          <p className="chat-header-sub">폭덕이 AI 코치</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <img src="/images/pokduck_default.png" alt="폭덕이" className="chat-welcome-img" />
            <p>안녕! 폭덕이야 🦆</p>
            <p>뭐든 편하게 얘기해!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'assistant' && (
              <img src="/images/pokduck_default.png" alt="폭덕이" className="chat-avatar" />
            )}
            <div className={`chat-bubble-content ${msg.role}`}>
              {formatMessage(msg.content)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder="폭덕이에게 말해봐..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={sending}
        />
        <button className="chat-send" onClick={handleSend} disabled={sending || !input.trim()}>
          {sending ? '...' : '↑'}
        </button>
      </div>
    </div>
  )
}

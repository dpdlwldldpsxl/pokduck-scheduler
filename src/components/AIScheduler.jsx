import { useState } from 'react'

export default function AIScheduler({ existingTasks, onAddTask }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setError('')
    setSuggestion(null)

    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDescription: input.trim(), existingTasks }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.')
      setSuggestion(data.suggestion)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    if (!suggestion) return
    onAddTask(suggestion.taskText, suggestion.category)
    setSuggestion(null)
    setInput('')
  }

  return (
    <section className="card">
      <h2>🤖 AI 스케줄러</h2>
      <p className="ai-subtitle">할 일을 말해주면 뇌과학적으로 최적의 시간을 찾아줄게!</p>

      <div className="task-input-row">
        <input
          type="text"
          placeholder="예: 이번 주까지 영어 단어 100개 외워야 해"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={loading}
        />
        <button onClick={handleSubmit} disabled={loading || !input.trim()}>
          {loading ? '생각 중...' : '추천받기'}
        </button>
      </div>

      {loading && (
        <p className="ai-loading">🦆 폭덕이가 뇌과학 논문 읽는 중...</p>
      )}

      {error && <p className="ai-error">{error}</p>}

      {suggestion && (
        <div className="ai-suggestion">
          <div className="ai-suggestion-header">
            <span className="ai-day-badge">{suggestion.day}요일</span>
            <span className="ai-time-badge">{suggestion.timeSlot}</span>
            <span className={`task-cat cat-${suggestion.category}`}>{suggestion.category}</span>
          </div>
          <p className="ai-task-text">{suggestion.taskText}</p>
          <p className="ai-reason">{suggestion.reason}</p>
          <button className="ai-add-btn" onClick={handleAdd}>
            이 시간에 추가하기 ✓
          </button>
        </div>
      )}
    </section>
  )
}

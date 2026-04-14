import { useState } from 'react'

const CATEGORIES = ['영어', '드럼', '필라테스', '사운드', '기타']

export default function TaskList({ tasks, onAdd, onToggle, onDelete }) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState('영어')

  const handleAdd = () => {
    if (!text.trim()) return
    onAdd(text.trim(), category)
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <section className="card">
      <h2>📝 해야 할 일</h2>
      <div className="task-input-row">
        <input
          type="text"
          id="task-input"
          placeholder="숙제나 할 일 입력..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <select
          id="task-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button onClick={handleAdd}>추가</button>
      </div>
      <ul id="task-list" className="task-list">
        {tasks.length === 0 ? (
          <li style={{ color: '#aaa', fontSize: '14px', padding: '8px 0' }}>
            아직 할 일이 없어요!
          </li>
        ) : (
          tasks.map((task, i) => (
            <li key={i} className={task.done ? 'done' : ''}>
              <div
                className={`task-check${task.done ? ' checked' : ''}`}
                onClick={() => onToggle(i)}
              >
                {task.done ? '✓' : ''}
              </div>
              <span className="task-text">{task.text}</span>
              <span className={`task-cat cat-${task.category}`}>{task.category}</span>
              <span className="task-delete" onClick={() => onDelete(i)}>×</span>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}

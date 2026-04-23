import { useLocation, useNavigate } from 'react-router-dom'
import { useSound } from '../hooks/useSound'

const TABS = [
  { path: '/today', label: '오늘', icon: '🏠' },
  { path: '/schedule', label: '일정', icon: '📅' },
  { path: '/goals', label: '기록', icon: '📒' },
  { path: '/coaching', label: '코칭', icon: '🤖' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { playSfx } = useSound()

  const handleClick = (path) => {
    if (location.pathname !== path) playSfx('click')
    navigate(path)
  }

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.path}
          className={`bottom-nav-item${location.pathname === tab.path ? ' active' : ''}`}
          onClick={() => handleClick(tab.path)}
        >
          <span className="bottom-nav-icon">{tab.icon}</span>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

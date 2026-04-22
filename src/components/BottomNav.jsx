import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { path: '/today', label: '오늘', icon: '🏠' },
  { path: '/schedule', label: '일정', icon: '📅' },
  { path: '/coaching', label: '코칭', icon: '🤖' },
  { path: '/mood', label: '기분', icon: '😊' },
  { path: '/goals', label: '목표', icon: '🎯' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.path}
          className={`bottom-nav-item${location.pathname === tab.path ? ' active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="bottom-nav-icon">{tab.icon}</span>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

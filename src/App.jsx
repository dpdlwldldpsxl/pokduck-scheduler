import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SoundProvider } from './hooks/useSound'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import TodayPage from './pages/TodayPage'
import SchedulePage from './pages/SchedulePage'
import CoachingPage from './pages/CoachingPage'
import GoalsPage from './pages/GoalsPage'
import NicknamePage from './pages/NicknamePage'

export default function App() {
  return (
    <BrowserRouter>
      <SoundProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/nickname" element={<ProtectedRoute><NicknamePage /></ProtectedRoute>} />
          <Route path="/today" element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
          <Route path="/coaching" element={<ProtectedRoute><CoachingPage /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
          {/* 레거시 /mood → 오늘 탭으로 리다이렉트 (기분은 오늘 탭 카드로 흡수) */}
          <Route path="/mood" element={<Navigate to="/today" replace />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </AuthProvider>
      </SoundProvider>
    </BrowserRouter>
  )
}

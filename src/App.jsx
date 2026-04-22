import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import TodayPage from './pages/TodayPage'
import SchedulePage from './pages/SchedulePage'
import CoachingPage from './pages/CoachingPage'
import MoodPage from './pages/MoodPage'
import GoalsPage from './pages/GoalsPage'
import NicknamePage from './pages/NicknamePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/nickname" element={<ProtectedRoute><NicknamePage /></ProtectedRoute>} />
          <Route path="/today" element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
          <Route path="/coaching" element={<ProtectedRoute><CoachingPage /></ProtectedRoute>} />
          <Route path="/mood" element={<ProtectedRoute><MoodPage /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

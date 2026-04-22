import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: '#7cc47c', fontSize: '16px' }}>로딩 중...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}

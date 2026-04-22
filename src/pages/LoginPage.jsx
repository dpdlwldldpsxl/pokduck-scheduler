import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/today', { replace: true })
  }, [user, navigate])

  return (
    <div className="login-page">
      <div className="login-header">
        <img src="/images/pokduck_default.png" alt="폭덕이" className="login-duck" />
        <h1>폭덕이 AI 코치</h1>
        <p>폭덕이와 같이 스케줄짜기</p>
      </div>
      <div className="login-card">
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#7cc47c',
                  brandAccent: '#5aab5a',
                },
                borderWidths: { buttonBorderWidth: '0px' },
                radii: { borderRadiusButton: '10px', inputBorderRadius: '10px' },
              },
            },
          }}
          localization={{
            variables: {
              sign_in: {
                email_label: '이메일',
                password_label: '비밀번호',
                button_label: '로그인',
                link_text: '이미 계정이 있으신가요? 로그인',
              },
              sign_up: {
                email_label: '이메일',
                password_label: '비밀번호',
                button_label: '회원가입',
                link_text: '계정이 없으신가요? 회원가입',
              },
            },
          }}
          providers={['google']}
          socialLayout="vertical"
          redirectTo={window.location.origin + '/today'}
        />
      </div>
    </div>
  )
}

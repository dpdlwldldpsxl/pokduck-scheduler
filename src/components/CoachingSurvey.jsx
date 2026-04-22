import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useSound } from '../hooks/useSound'

const QUESTIONS = [
  {
    key: 'biggest_challenge',
    question: '요즘 가장 힘든 게 뭐야?',
    options: ['시간이 부족해', '집중이 안 돼', '번아웃 온 것 같아', '뭘 해야 할지 모르겠어', '다 힘들어...'],
  },
  {
    key: 'best_focus_time',
    question: '하루 중 언제 가장 집중 잘 돼?',
    options: ['아침 (6~9시)', '오전 (9~12시)', '오후 (12~18시)', '저녁 (18~22시)', '밤 (22시 이후)', '잘 모르겠어'],
  },
  {
    key: 'stress_relief',
    question: '스트레스 받으면 보통 어떻게 풀어?',
    options: ['운동', '음악 듣기', '잠자기', '수다 떨기', '먹기', '아무것도 안 함'],
  },
  {
    key: 'main_goal',
    question: '지금 가장 이루고 싶은 목표는?',
    options: ['학원/공부 잘 따라가기', '일과 생활 균형 맞추기', '새로운 습관 만들기', '멘탈 관리', '체력 키우기'],
  },
]

export default function CoachingSurvey({ onComplete }) {
  const { user } = useAuth()
  const { playSfx } = useSound()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)

  const current = QUESTIONS[step]

  const handleSelect = async (answer) => {
    playSfx('click')
    const newAnswers = { ...answers, [current.key]: answer }
    setAnswers(newAnswers)

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1)
    } else {
      setSaving(true)
      playSfx('confirm')
      await supabase.from('user_profile_survey').upsert({
        user_id: user.id,
        ...newAnswers,
        updated_at: new Date().toISOString(),
      })
      onComplete()
    }
  }

  return (
    <div className="survey-container">
      <div className="survey-header">
        <img src="/images/pokduck_default.png" alt="폭덕이" className="survey-duck" />
        <p className="survey-progress">{step + 1} / {QUESTIONS.length}</p>
      </div>
      <div className="survey-card">
        <h2 className="survey-question">{current.question}</h2>
        <div className="survey-options">
          {current.options.map((opt) => (
            <button
              key={opt}
              className="survey-option"
              onClick={() => handleSelect(opt)}
              disabled={saving}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

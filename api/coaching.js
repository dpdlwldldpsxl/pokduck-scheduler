import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `당신은 "폭덕이"라는 AI 라이프 코치입니다. 귀여운 오리 캐릭터이지만, 내면은 전문 코치입니다.

## 캐릭터
- 따뜻하고 공감 먼저, 조언은 그 다음
- 가끔 🦆 이모지 사용
- 반말로 친근하게 대화 (존댓말 X)
- "~야", "~해", "~지?" 말투

## 코칭 전문 분야

### 뇌과학 기반 시간 관리
- 울트라디안 리듬: 90분 집중 → 20분 휴식 사이클
- 아침 코르티솔 피크 (기상 후 1~2시간): 가장 어려운 공부/작업 배치
- 오후 2~4시 서카디안 딥: 단순 반복 작업만, 새로운 학습 금지
- 운동 후 BDNF 분비 → 학습 효과 2배, 운동 직후 학습 추천

### 학습 최적화
- 에빙하우스 망각곡선: 배운 직후 → 1일 → 3일 → 7일 → 30일 복습
- 능동적 회상(Active Recall): 읽기보다 스스로 떠올리기가 3배 효과적
- 인터리빙: 한 과목만 몰아서 하지 말고 섞어서 공부
- 포모도로: 25분 집중 + 5분 휴식, 4세트 후 긴 휴식

### 멘탈 케어 (CBT 기반)
- 인지 왜곡 발견: "나는 항상 실패해" → "이번에 안 된 것뿐이야"
- 감정 라벨링: 감정에 이름 붙이기만 해도 스트레스 30% 감소
- 5-4-3-2-1 그라운딩: 감각에 집중해서 불안 낮추기
- 자기 자비: 실패해도 괜찮다, 쉬어도 괜찮다

### 번아웃 감지
다음 징후가 보이면 즉시 쉬라고 권유:
- "다 힘들어", "의미 없어", "그만두고 싶어"
- 3일 이상 피곤하다고 말할 때
- 할 일을 계속 미룬다고 말할 때

## 대화 유형별 접근
- 일정 상담: 우선순위 매트릭스 (긴급+중요 먼저), 빈 시간 활용 추천
- 멘탈 케어: 공감 → 감정 라벨링 → 구체적 행동 1가지 제안
- 학습 조언: 현재 학습법 분석 → 뇌과학 기반 개선안
- 자유 대화: 편하게 듣고, 필요하면 조언

## 규칙
- 반드시 한국어
- 3~5문장으로 간결하게
- 사용자 이름을 불러줘
- 맞춤 조언할 때 근거를 짧게 설명 ("뇌과학적으로~", "심리학에서~")
- 절대 의학적 진단하지 말 것`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { conversationId, message, conversationType } = req.body
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: '인증이 필요합니다.' })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: '인증 실패' })
  }

  try {
    const { data: history } = await supabase
      .from('coaching_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    const { data: scheduleItems } = await supabase
      .from('schedule_items')
      .select('title, day_of_week, start_time, end_time, academies(name)')
      .eq('user_id', user.id)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('text, category, is_done')
      .eq('user_id', user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const { data: survey } = await supabase
      .from('user_profile_survey')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const days = ['일', '월', '화', '수', '목', '금', '토']
    const scheduleText = scheduleItems?.length > 0
      ? scheduleItems.map((s) => `${days[s.day_of_week]} ${s.start_time?.slice(0, 5)} ${s.title}`).join('\n')
      : '등록된 일정 없음'

    const tasksText = tasks?.length > 0
      ? tasks.map((t) => `${t.is_done ? '✅' : '⬜'} ${t.text} (${t.category})`).join('\n')
      : '할 일 없음'

    const surveyText = survey
      ? `가장 힘든 점: ${survey.biggest_challenge || '미응답'}
집중 잘 되는 시간: ${survey.best_focus_time || '미응답'}
스트레스 해소법: ${survey.stress_relief || '미응답'}
주요 목표: ${survey.main_goal || '미응답'}`
      : '설문 미완료'

    const contextPrompt = `${SYSTEM_PROMPT}

[사용자 정보]
이름: ${profile?.display_name || '사용자'}
대화 유형: ${conversationType || 'general'}

[사용자 성향]
${surveyText}

[현재 주간 일정]
${scheduleText}

[할 일 목록]
${tasksText}

위 정보를 바탕으로 이 사용자에게 맞춤형으로 대화하세요. 사용자의 힘든 점과 목표를 기억하고, 집중 잘 되는 시간대에 중요한 작업을 추천하세요.`

    // 유저 메시지 저장
    await supabase.from('coaching_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    })

    // OpenRouter API 호출
    const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'minimax/minimax-m2.5:free',
        messages: [
          { role: 'system', content: contextPrompt },
          ...(history || []).map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
      }),
    })

    const data = await apiRes.json()

    if (!apiRes.ok) {
      console.error('OpenRouter error:', data)
      return res.status(500).json({ error: '폭덕이가 잠시 쉬고 있어요...' })
    }

    const assistantContent = data.choices?.[0]?.message?.content || '...'

    // 어시스턴트 메시지 저장
    await supabase.from('coaching_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantContent,
    })

    // 대화 제목 업데이트
    if (!history || history.length === 0) {
      const title = message.length > 20 ? message.slice(0, 20) + '...' : message
      await supabase
        .from('coaching_conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
    } else {
      await supabase
        .from('coaching_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
    }

    return res.json({ content: assistantContent })
  } catch (error) {
    console.error('Coaching error:', error)
    return res.status(500).json({ error: '폭덕이가 잠시 쉬고 있어요... 다시 시도해주세요.' })
  }
}

import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `당신은 "폭덕이"라는 AI 라이프 코치입니다. 귀여운 오리 캐릭터이지만, 내면은 전문 코치입니다.

## 캐릭터
- 따뜻하고 친근한 친구 같은 말투
- 반말 사용 ("~야", "~해", "~지?", "~거든")
- 가끔 🦆 이모지 사용

## 대화 패턴 (반드시 이 순서로)

### 1단계: 공감 (필수)
- 사용자의 감정을 먼저 읽고 인정해줘
- "그거 진짜 힘들지", "그런 마음 충분히 이해해"
- 절대 바로 해결책부터 제시하지 마

### 2단계: 구체적 질문
- 상황을 더 파악하기 위한 질문 1개
- "그중에 제일 스트레스인 게 뭐야?", "언제부터 그랬어?"

### 3단계: 맞춤 해결책 (요청 시)
- 사용자가 원할 때만 구체적 행동 1~2가지 제안
- 근거를 짧게 ("뇌과학적으로~", "심리학에서~")
- 작고 실행 가능한 것만 추천

## 전문 지식 (필요할 때만 활용)
- 시간 관리: 울트라디안 리듬(90분 집중+20분 휴식), 포모도로
- 학습: 에빙하우스 망각곡선, 능동적 회상, 인터리빙
- 멘탈: 감정 라벨링, 인지 재구성, 자기 자비
- 번아웃: 3일 이상 피곤/의욕 없음 → 쉬라고 권유

## 하지 말 것
- 처음부터 "쉬어"라고 하지 마. 공감 먼저
- 뜬금없는 조언 금지. 사용자가 말한 내용에만 반응
- 한 번에 너무 많은 조언 금지. 1~2개만
- 의학적 진단 금지

## 규칙
- 반드시 한국어만 사용
- 3~5문장으로 간결하게
- 사용자 이름을 불러줘
- 마크다운 서식 사용하지 말 것
- 이모지는 🦆만 가끔 사용`

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

    const { data: studyNotes } = await supabase
      .from('study_notes')
      .select('title, content, studied_at, next_review, review_count, academies(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

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
      ? tasks.map((t) => `${t.is_done ? '완료' : '미완료'} ${t.text} (${t.category})`).join('\n')
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

[최근 학습 메모]
${studyNotes?.length > 0
  ? studyNotes.map((n) => `${n.academies?.name || '기타'} (${n.studied_at}): ${n.title}${n.content ? ' - ' + n.content : ''} [복습 ${n.review_count}회, 다음 복습: ${n.next_review}]`).join('\n')
  : '학습 메모 없음'}

위 정보를 바탕으로 이 사용자에게 맞춤형으로 대화하세요. 학습 메모가 있으면 배운 내용을 활용해서 복습을 도와주세요.`

    // 학습 내용 자동 감지 → 메모 저장
    const learnKeywords = ['배웠', '배운', '공부했', '연습했', '레슨에서', '수업에서', '학원에서']
    if (learnKeywords.some((k) => message.includes(k))) {
      // 학원 자동 매칭
      let matchedAcademy = null
      if (scheduleItems) {
        for (const item of scheduleItems) {
          if (item.academies?.name && message.includes(item.academies.name)) {
            matchedAcademy = item.academy_id
            break
          }
        }
      }
      const studiedAt = new Date().toISOString().split('T')[0]
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + 1)
      await supabase.from('study_notes').insert({
        user_id: user.id,
        title: message.length > 50 ? message.slice(0, 50) + '...' : message,
        content: message,
        academy_id: matchedAcademy,
        studied_at: studiedAt,
        next_review: nextDate.toISOString().split('T')[0],
      })
    }

    // 유저 메시지 저장
    await supabase.from('coaching_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    })

    // Gemini 메시지 형식 변환
    const geminiHistory = (history || []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    // Gemini 2.5 Flash API 호출
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: contextPrompt }] },
          contents: [
            ...geminiHistory,
            { role: 'user', parts: [{ text: message }] },
          ],
          generationConfig: {
            maxOutputTokens: 300,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    const geminiData = await geminiRes.json()

    if (!geminiRes.ok) {
      console.error('Gemini error:', geminiData)
      return res.status(500).json({ error: '폭덕이가 잠시 쉬고 있어요...' })
    }

    const assistantContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '...'

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

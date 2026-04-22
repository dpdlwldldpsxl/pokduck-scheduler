import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `당신은 "폭덕이"라는 AI 라이프 코치 캐릭터입니다. 귀여운 오리 캐릭터이며, 사용자의 일정 관리, 멘탈 케어, 학습 최적화를 돕습니다.

성격:
- 따뜻하고 격려하는 말투
- 가끔 귀여운 오리 이모지 🦆 사용
- 공감 먼저, 조언은 그 다음
- 뇌과학/심리학 기반 실용적 조언 제공
- 번아웃 징후가 보이면 쉬라고 권유

대화 유형별 접근:
- 일정 상담: 효율적인 시간 배치, 우선순위 정리
- 멘탈 케어: 공감, 감정 정리, 스트레스 관리법
- 학습 조언: 에빙하우스 망각곡선, 집중력 최적화, 복습 전략
- 자유 대화: 편하게 수다, 고민 상담

규칙:
- 한국어로 대화
- 답변은 간결하게 (3~5문장 정도)
- 너무 길게 설명하지 말 것
- 사용자의 현재 일정/컨텍스트를 참고하여 맞춤 조언`

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
    // 대화 기록 불러오기 (최근 20개)
    const { data: history } = await supabase
      .from('coaching_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    // 유저 컨텍스트 불러오기
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

    const days = ['일', '월', '화', '수', '목', '금', '토']
    const scheduleText = scheduleItems?.length > 0
      ? scheduleItems.map((s) => `${days[s.day_of_week]} ${s.start_time?.slice(0, 5)} ${s.title}`).join('\n')
      : '등록된 일정 없음'

    const tasksText = tasks?.length > 0
      ? tasks.map((t) => `${t.is_done ? '✅' : '⬜'} ${t.text} (${t.category})`).join('\n')
      : '할 일 없음'

    const contextPrompt = `${SYSTEM_PROMPT}

[사용자 정보]
이름: ${profile?.display_name || '사용자'}
대화 유형: ${conversationType || 'general'}

[현재 주간 일정]
${scheduleText}

[할 일 목록]
${tasksText}`

    // Gemini API 메시지 형식으로 변환
    const geminiHistory = (history || []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    // 유저 메시지 저장
    await supabase.from('coaching_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    })

    // Gemini API 호출
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: contextPrompt }] },
          contents: [
            ...geminiHistory,
            { role: 'user', parts: [{ text: message }] },
          ],
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

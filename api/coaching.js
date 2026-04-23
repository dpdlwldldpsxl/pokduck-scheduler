import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ────────────────────────────────────────────────────
// 층1: 폭덕이 캐릭터 + 공통 규칙
// 층2(전문 기법) + 층4(유형 특화)는 docs/coaching-prompts/*.md에서 주입
// 층3(유저 데이터)는 아래 handler에서 동적 주입
// ────────────────────────────────────────────────────
const BASE_PROMPT = `당신은 "폭덕이"라는 AI 라이프 코치입니다. 귀여운 오리 캐릭터이지만, 내면은 전문 코치입니다.

## 캐릭터
- 따뜻하고 친근한 친구 같은 말투
- 반말 사용 ("~야", "~해", "~지?", "~거든")
- 🦆 이모지는 가끔만 (매번 X)
- 사용자 이름을 간헐적으로 불러줌

## 공통 규칙
- 반드시 한국어만 사용 (한자 절대 금지)
- 기본 3~5문장 간결 (감정 덤프 받을 땐 5~7문장 허용)
- 마크다운은 **정말 강조할 때만** (굵기 \`**글자**\` 가끔 사용 가능)
- 한 번에 조언 1~2개만 (3개 이상 금지)

## 공통 금지
- 의학적 진단 금지 ("너 우울증이야" X)
- 긍정 강요 ("괜찮아질 거야!") 금지 — 감정 무시 느낌
- 뜬금없는 조언 금지 (유저가 말한 내용에만 반응)
- 한자·영어 단어 남발 금지`

// ────────────────────────────────────────────────────
// 유형별 프롬프트 로드 (콜드스타트 시 한 번, 이후 캐시)
// ────────────────────────────────────────────────────
function loadPromptFile(name) {
  try {
    return fs.readFileSync(
      path.join(process.cwd(), 'docs', 'coaching-prompts', `${name}.md`),
      'utf-8'
    )
  } catch (e) {
    console.warn(`[coaching] Failed to load prompt: ${name}`, e.message)
    return ''
  }
}

const TYPE_PROMPTS = {
  general: loadPromptFile('general'),
  schedule: loadPromptFile('schedule'),
  mental: loadPromptFile('mental'),
  study: loadPromptFile('study'),
}

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

    // 최근 7일 기분 로그
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const since = sevenDaysAgo.toISOString().split('T')[0]

    const { data: moodLogs } = await supabase
      .from('mood_logs')
      .select('mood, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false })

    // 최근 7일 습관 로그 (습관 이름 포함)
    const { data: habits } = await supabase
      .from('habits')
      .select('id, title')
      .eq('user_id', user.id)

    const { data: habitLogs } = await supabase
      .from('habit_logs')
      .select('habit_id, logged_date')
      .eq('user_id', user.id)
      .gte('logged_date', since)

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

    // 기분 트렌드 텍스트 (단일 기록보다 패턴 해석 우선)
    const MOOD_LABELS = {
      burnout: '😫 번아웃',
      angry: '😤 짜증',
      complex: '🤔 복잡',
      calm: '😌 평온',
      happy: '😊 좋음',
    }
    let moodText
    if (!moodLogs || moodLogs.length === 0) {
      moodText = '기분 기록 없음'
    } else {
      const counts = { burnout: 0, angry: 0, complex: 0, calm: 0, happy: 0 }
      moodLogs.forEach((m) => { counts[m.mood] = (counts[m.mood] || 0) + 1 })
      const dominant = Object.entries(counts)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([m, n]) => `${MOOD_LABELS[m]} ${n}일`)
        .join(', ')
      const timeline = moodLogs
        .map((m) => `${m.logged_at.slice(5)} ${MOOD_LABELS[m.mood]}`)
        .join(' → ')
      moodText = `최근 ${moodLogs.length}일 분포: ${dominant}
시간순: ${timeline}`
      if (counts.complex >= 3) {
        moodText += `\n⚠️ 🤔 복잡이 3일 이상 → 감정 하나로 못 고르는 상태. 명료화 질문 우선.`
      }
      if (counts.burnout >= 2) {
        moodText += `\n⚠️ 번아웃 2일+ → 쉼 권유 대상.`
      }
    }

    // 습관 달성 트렌드
    let habitText
    if (!habits || habits.length === 0) {
      habitText = '등록된 습관 없음'
    } else {
      const summary = habits.map((h) => {
        const doneCount = (habitLogs || []).filter((l) => l.habit_id === h.id).length
        return `${h.title}: 7일 중 ${doneCount}일`
      }).join('\n')
      habitText = summary
      const zeroHabits = habits.filter((h) =>
        !(habitLogs || []).some((l) => l.habit_id === h.id)
      )
      if (zeroHabits.length > 0) {
        habitText += `\n⚠️ 7일간 0회 습관: ${zeroHabits.map((h) => h.title).join(', ')}`
      }
    }

    // 대화 유형에 맞는 전문 프롬프트 (층2 + 층4)
    const type = TYPE_PROMPTS[conversationType] ? conversationType : 'general'
    const typePrompt = TYPE_PROMPTS[type] || ''

    const contextPrompt = `${BASE_PROMPT}

# ━━━ 이 대화 유형 전용 가이드 (${type}) ━━━
${typePrompt}

# ━━━ 이 사용자에 대한 실시간 데이터 (층3) ━━━

[사용자 정보]
이름: ${profile?.display_name || '사용자'}
대화 유형: ${type}

[사용자 성향 설문]
${surveyText}

[현재 주간 일정]
${scheduleText}

[할 일 목록]
${tasksText}

[최근 7일 기분 트렌드]
${moodText}

[최근 7일 습관 수행]
${habitText}

[최근 학습 메모]
${studyNotes?.length > 0
  ? studyNotes.map((n) => `${n.academies?.name || '기타'} (${n.studied_at}): ${n.title}${n.content ? ' - ' + n.content : ''} [복습 ${n.review_count}회, 다음 복습: ${n.next_review}]`).join('\n')
  : '학습 메모 없음'}

# ━━━ 작동 지시 ━━━
위 데이터를 근거 삼아 **구체적으로** 반응해. "그런 일이 있구나" 같은 막연한 공감 말고, "네 일정 보니까 화요일에 영어+드럼 몰려있네" 식으로 데이터를 인용해 말 걸어. 유저가 말 꺼내기 전에 패턴/맹점을 먼저 짚는 게 이 앱의 차별점이야.`

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

    const parts = geminiData.candidates?.[0]?.content?.parts || []
    const assistantContent = parts.filter((p) => p.text).map((p) => p.text).join('') || '...'

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

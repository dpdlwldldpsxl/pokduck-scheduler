import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// 대화 시작 시 폭덕이가 먼저 던지는 분석 기반 오프닝
// 유저는 빈 채팅창을 마주하지 않음 — 데이터 읽고 말 거는 폭덕이를 만남

const BASE_PROMPT = `당신은 "폭덕이"라는 AI 라이프 코치입니다.
이번 호출은 **대화 오프닝**을 생성하는 호출입니다.
유저가 아무 말도 하지 않은 상태에서, 네가 먼저 유저의 데이터를 읽고 말을 건네는 상황입니다.

## 오프닝 작성 규칙
1. 반드시 3~4문장 이내. 길게 X.
2. 한국어만. 반말 ("~야", "~해"). 🦆 아주 가끔.
3. **첫 문장:** 이름 불러주며 자연스러운 인사 (유형 분위기 반영)
4. **둘째 문장:** 유저 데이터에서 발견한 구체적 패턴/이슈 1개 언급
   - "네 일정 보니까 이번 주 야근 2일이야" 식으로 데이터 인용
   - 막연한 말 금지: "요즘 바쁘지?" X
5. **셋째 문장 (끝):** 유저가 짧게 답할 수 있는 **구체 질문 1개**
   - Yes/No, 한 단어, 한 문장으로 답 가능한 수준
   - "영어가 힘든 거야, 아니면 그날 스케줄이 빡빡한 거야?"
   - 열린 질문 금지: "오늘 어때?" X

## 금지
- 이론/근거 설명 (오프닝은 짧게, 대화 이어지면 설명)
- 조언/해결책 (질문만)
- 마크다운 굵기 남발 (필요한 경우만 \`**\`)
- 데이터 여러 개 언급 (1개만 딱)
- "안녕! 폭덕이야 뭐든 물어봐!" 같은 뻔한 인사

## 유형별 분위기
- general: 가볍게, 친근하게
- schedule: 데이터 중심, 효율 관점
- mental: 따뜻하게, 공감 먼저
- study: 최근 학습 복기 유도`

function loadPromptFile(name) {
  try {
    return fs.readFileSync(
      path.join(process.cwd(), 'docs', 'coaching-prompts', `${name}.md`),
      'utf-8'
    )
  } catch {
    return ''
  }
}

const TYPE_PROMPTS = {
  general: loadPromptFile('general'),
  schedule: loadPromptFile('schedule'),
  mental: loadPromptFile('mental'),
  study: loadPromptFile('study'),
}

const MOOD_LABELS = {
  burnout: '😫 번아웃',
  angry: '😤 짜증',
  complex: '🤔 복잡',
  calm: '😌 평온',
  happy: '😊 좋음',
}

const ENERGY_LABELS = {
  tired: '😴 피곤',
  normal: '😶 보통',
  good: '💪 좋음',
  foggy: '😵‍💫 멍함',
  sick: '🤕 아픔',
}

const FALLBACK_OPENER = {
  general: '안녕! 오늘 어떻게 지냈는지 편하게 말해봐 🦆',
  schedule: '안녕! 이번 주 일정 같이 볼까? 제일 부담되는 날이 언제야?',
  mental: '안녕. 요즘 마음 어때? 편하게 한 마디만 해줘도 돼.',
  study: '안녕! 최근에 배운 것 중에 머리에 제일 많이 남은 게 뭐야?',
}

// 데이터 누적도 평가 — 어떤 오프닝 프롬프트 쓸지 결정
function assessDataLevel({ moodLogs, habits, scheduleItems, studyNotes, survey }) {
  const moodDays = moodLogs?.length || 0
  const habitCount = habits?.length || 0
  const scheduleCount = scheduleItems?.length || 0
  const studyCount = studyNotes?.length || 0
  const hasSurvey = !!survey

  const totalSignals =
    moodDays + habitCount + scheduleCount + studyCount + (hasSurvey ? 1 : 0)

  if (totalSignals === 0) return 'zero'
  if (moodDays < 3 && studyCount < 2 && totalSignals < 5) return 'light'
  return 'rich'
}

const LEVEL_INSTRUCTIONS = {
  zero: `
[데이터 상태: ZERO — 유저를 처음 만난 상태]
- 데이터 인용 **금지** (인용할 게 없음)
- 반갑게 인사 + 폭덕이가 뭐 해주는지 한 줄 소개 + 가벼운 질문 1개
- 질문은 답하기 쉬운 것: "오늘 뭐 할 예정이야?" / "요즘 뭐 배우고 있어?"
- "데이터 쌓이면 도움 커져" 같은 안내는 대화 뒤에 (첫 오프닝엔 X)
- 예시: "반가워! 🦆 나는 너의 하루를 같이 정리해주는 폭덕이야. 오늘 뭐 할 예정이야?"`,

  light: `
[데이터 상태: LIGHT — 데이터가 조금 쌓이기 시작함]
- 있는 데이터 **1개만** 가볍게 언급 (없는 건 언급 X)
- 패턴 해석 **금지** (데이터 부족)
- 구체 질문으로 대화 시작
- 예시: "오! 이번 주 영어 등록해놨네. 오늘은 영어 수업 어땠어?"
- 예시: "어제 😌 평온으로 기록했네. 오늘은 어때?"`,

  rich: `
[데이터 상태: RICH — 충분한 데이터로 본격 분석 가능]
- 여러 데이터 교차 분석해서 **가장 눈에 띄는 패턴 1개** 짚음
- 맹점/이슈 탐지 OK
- 구체 질문으로 마무리
- 예시: "민희야, 지난주부터 야근 2일이랑 필라테스 0회 겹쳤네. 몸이 쉬어달라는 거 같은데, 이번 주는 좀 괜찮아?"`,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { conversationId, conversationType } = req.body
  const authHeader = req.headers.authorization

  if (!authHeader) return res.status(401).json({ error: '인증이 필요합니다.' })

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: '인증 실패' })

  const type = TYPE_PROMPTS[conversationType] ? conversationType : 'general'

  try {
    // 필요한 컨텍스트 로드 (coaching.js와 동일 패턴이지만 message 없음)
    const [
      { data: profile },
      { data: scheduleItems },
      { data: studyNotes },
      { data: survey },
    ] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
      supabase
        .from('schedule_items')
        .select('title, day_of_week, start_time, academies(name)')
        .eq('user_id', user.id),
      supabase
        .from('study_notes')
        .select('title, studied_at, next_review, review_count, academies(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('user_profile_survey')
        .select('*')
        .eq('user_id', user.id)
        .single(),
    ])

    // 7일 기분/습관
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const since = sevenDaysAgo.toISOString().split('T')[0]

    const [{ data: moodLogs }, { data: habits }, { data: habitLogs }] = await Promise.all([
      supabase
        .from('mood_logs')
        .select('mood, energy, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', since)
        .order('logged_at', { ascending: false }),
      supabase.from('habits').select('id, title').eq('user_id', user.id),
      supabase
        .from('habit_logs')
        .select('habit_id, logged_date')
        .eq('user_id', user.id)
        .gte('logged_date', since),
    ])

    const days = ['일', '월', '화', '수', '목', '금', '토']
    const scheduleText = scheduleItems?.length
      ? scheduleItems.map((s) => `${days[s.day_of_week]} ${s.start_time?.slice(0, 5)} ${s.title}`).join('\n')
      : '일정 없음'

    const moodEntries = (moodLogs || []).filter((m) => m.mood)
    const energyEntries = (moodLogs || []).filter((m) => m.energy)

    let moodText = '기분 기록 없음'
    if (moodEntries.length) {
      const counts = {}
      moodEntries.forEach((m) => { counts[m.mood] = (counts[m.mood] || 0) + 1 })
      const dominant = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([m, n]) => `${MOOD_LABELS[m]} ${n}일`)
        .join(', ')
      moodText = `최근 ${moodEntries.length}일 기분: ${dominant}`
      if ((counts.complex || 0) >= 3) moodText += ' / ⚠️ 복잡 다수'
      if ((counts.burnout || 0) >= 2) moodText += ' / ⚠️ 번아웃 신호'
    }

    let energyText = '에너지 기록 없음'
    if (energyEntries.length) {
      const counts = {}
      energyEntries.forEach((m) => { counts[m.energy] = (counts[m.energy] || 0) + 1 })
      const dominant = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([e, n]) => `${ENERGY_LABELS[e]} ${n}일`)
        .join(', ')
      energyText = `최근 ${energyEntries.length}일 에너지: ${dominant}`
      if ((counts.sick || 0) >= 2) energyText += ' / ⚠️ 아픔 다수'
      if ((counts.foggy || 0) >= 3) energyText += ' / ⚠️ 브레인포그 지속'
      if ((counts.tired || 0) >= 4) energyText += ' / ⚠️ 피곤 누적'
    }

    let habitText = '습관 없음'
    if (habits?.length) {
      const summary = habits
        .map((h) => {
          const n = (habitLogs || []).filter((l) => l.habit_id === h.id).length
          return `${h.title}: ${n}/7일`
        })
        .join(', ')
      habitText = summary
    }

    const studyText = studyNotes?.length
      ? studyNotes
          .slice(0, 5)
          .map((n) => `${n.academies?.name || '기타'}(${n.studied_at}): ${n.title}`)
          .join('\n')
      : '학습 메모 없음'

    const surveyText = survey
      ? `힘든점:${survey.biggest_challenge || '?'} / 목표:${survey.main_goal || '?'}`
      : '설문 없음'

    const typePrompt = TYPE_PROMPTS[type] || ''
    const dataLevel = assessDataLevel({ moodLogs, habits, scheduleItems, studyNotes, survey })
    const levelInstruction = LEVEL_INSTRUCTIONS[dataLevel]

    const prompt = `${BASE_PROMPT}

# ━━━ 이 대화 유형 가이드 (${type}) ━━━
${typePrompt}

# ━━━ 유저 데이터 (이것 기반으로 오프닝) ━━━
[이름] ${profile?.display_name || '사용자'}
[유형] ${type}
[성향] ${surveyText}
[주간 일정]
${scheduleText}
[7일 기분 트렌드] ${moodText}
[7일 에너지/몸 상태] ${energyText}
[7일 습관] ${habitText}
[최근 학습 메모]
${studyText}

# ━━━ 데이터 누적도 기반 행동 지시 ━━━
${levelInstruction}

# ━━━ 공통 지시 ━━━
위 가이드에 맞춰 오프닝 1개만 작성. 3~4문장 이내. 질문 1개로 마무리.
다른 설명/주석 없이 오프닝 문장만 출력.`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: prompt }] },
          contents: [{ role: 'user', parts: [{ text: '오프닝 시작.' }] }],
          generationConfig: {
            maxOutputTokens: 200,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    let assistantContent
    if (!geminiRes.ok) {
      console.error('Gemini start error:', await geminiRes.text().catch(() => ''))
      assistantContent = FALLBACK_OPENER[type] || FALLBACK_OPENER.general
    } else {
      const data = await geminiRes.json()
      const parts = data.candidates?.[0]?.content?.parts || []
      assistantContent = parts.filter((p) => p.text).map((p) => p.text).join('').trim()
      if (!assistantContent) {
        assistantContent = FALLBACK_OPENER[type] || FALLBACK_OPENER.general
      }
    }

    // DB 저장
    await supabase.from('coaching_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantContent,
    })

    await supabase
      .from('coaching_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return res.json({ content: assistantContent })
  } catch (error) {
    console.error('coaching-start error:', error)
    return res.status(500).json({ error: '폭덕이가 잠시 쉬고 있어요...' })
  }
}

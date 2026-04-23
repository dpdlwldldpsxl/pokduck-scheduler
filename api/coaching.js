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

// 시간대별 반응 톤 가이드 (KST 기준)
function getTimeOfDay() {
  const hour = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
  ).getHours()
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 23) return 'evening'
  return 'night'
}

const TIME_GUIDES = {
  morning: `[지금 시간대: 아침 (5~11시)]
- 오늘 일정 기반 **미리보기/설계 톤**. 복기·회고 톤 X
- "오늘 ~ 있네, 뭐부터 할까?" 같은 플래닝 중심
- 에너지 아직 안 올라온 상태 가정. 부담 작게, 우선순위 1~3개 수준`,

  afternoon: `[지금 시간대: 낮/오후 (11~17시)]
- **점검 톤**. 오전 한 일 간단 체크 + 오후 포커스 한 개
- 점심 직후(12~14시)는 집중력 저점. 단순 작업 제안에 맞음
- 오후 중반(15~17시)은 창의 회복 구간`,

  evening: `[지금 시간대: 저녁 (17~23시)]
- **복기/회고 톤**. "오늘 어땠어?" 지향
- 하루 돌아보기 + 감정 정리 + 내일 씨앗 1개
- 이 시간대 유저 에너지 낮음. 긴 대화 유도 X. 짧고 따뜻하게`,

  night: `[지금 시간대: 심야 (23시~새벽)]
- **짧고 부드럽게**. 밤늦게 앱 켠 유저는 감정 이슈 가능성
- 수면 리듬 배려. 자극적인 질문·조언 X
- "오늘 내려놓고 쉴 준비" 쪽으로 유도`,
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
      .select('mood, energy, logged_at')
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

    // 기분/에너지 트렌드 텍스트 (단일 기록보다 패턴 해석 우선)
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

    const moodEntries = (moodLogs || []).filter((m) => m.mood)
    const energyEntries = (moodLogs || []).filter((m) => m.energy)

    let moodText
    if (moodEntries.length === 0) {
      moodText = '기분 기록 없음'
    } else {
      const counts = { burnout: 0, angry: 0, complex: 0, calm: 0, happy: 0 }
      moodEntries.forEach((m) => { counts[m.mood] = (counts[m.mood] || 0) + 1 })
      const dominant = Object.entries(counts)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([m, n]) => `${MOOD_LABELS[m]} ${n}일`)
        .join(', ')
      const timeline = moodEntries
        .map((m) => `${m.logged_at.slice(5)} ${MOOD_LABELS[m.mood]}`)
        .join(' → ')
      moodText = `최근 ${moodEntries.length}일 기분: ${dominant}
시간순: ${timeline}`
      if (counts.complex >= 3) moodText += `\n⚠️ 🤔 복잡 3일+ → 감정 혼합 상태. 명료화 질문 우선.`
      if (counts.burnout >= 2) moodText += `\n⚠️ 번아웃 2일+ → 쉼 권유 대상.`
    }

    let energyText
    if (energyEntries.length === 0) {
      energyText = '에너지 기록 없음'
    } else {
      const counts = { tired: 0, normal: 0, good: 0, foggy: 0, sick: 0 }
      energyEntries.forEach((m) => { counts[m.energy] = (counts[m.energy] || 0) + 1 })
      const dominant = Object.entries(counts)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([m, n]) => `${ENERGY_LABELS[m]} ${n}일`)
        .join(', ')
      energyText = `최근 ${energyEntries.length}일 에너지: ${dominant}`
      if ((counts.sick || 0) >= 2) energyText += `\n⚠️ 아픔 2일+ → 병원/휴식 권유.`
      if ((counts.foggy || 0) >= 3) energyText += `\n⚠️ 멍함 3일+ → 수면·영양·과부하 점검.`
      if ((counts.tired || 0) >= 4) energyText += `\n⚠️ 피곤 4일+ → 번아웃 전조 가능성.`
    }

    // 기분+에너지 교차 분석 (같은 날 조합)
    const crossObs = []
    for (const m of moodLogs || []) {
      if (m.mood && m.energy) {
        // 특이 조합 찾기
        if (m.mood === 'happy' && m.energy === 'tired') {
          crossObs.push(`${m.logged_at.slice(5)}: 기분은 좋은데 몸은 피곤`)
        }
        if (m.mood === 'burnout' && (m.energy === 'good' || m.energy === 'normal')) {
          crossObs.push(`${m.logged_at.slice(5)}: 몸은 멀쩡한데 감정이 번아웃 (원인 감정/환경 쪽)`)
        }
        if (m.mood === 'angry' && m.energy === 'sick') {
          crossObs.push(`${m.logged_at.slice(5)}: 아픔+짜증 (호르몬/컨디션 영향 가능성)`)
        }
      }
    }
    const crossText = crossObs.length > 0 ? crossObs.join('\n') : '특이 조합 없음'

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
    const timeOfDay = getTimeOfDay()
    const timeGuide = TIME_GUIDES[timeOfDay]

    const contextPrompt = `${BASE_PROMPT}

# ━━━ 이 대화 유형 전용 가이드 (${type}) ━━━
${typePrompt}

# ━━━ 시간대 가이드 ━━━
${timeGuide}

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

[최근 7일 에너지/몸 상태]
${energyText}

[기분×에너지 교차 관찰]
${crossText}

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

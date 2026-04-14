import Anthropic from '@anthropic-ai/sdk'

const FIXED_SCHEDULE = `
월요일: 08:05 영어 회화 수업, 09:00 출근, 20:00 필라테스
화요일: 07:00 아침 공부 시간(1.5시간), 09:00 출근 (야근 가능성 있음)
수요일: 08:05 영어 회화 수업, 09:00 출근, 20:00 필라테스
목요일: 07:00 아침 공부 시간(1.5시간), 09:00 출근, 19:00 사운드 디자인 레슨
금요일: 07:00 아침 공부 시간(1.5시간), 09:00 출근
토요일: 11:00 필라테스, 15:00 드럼 레슨
일요일: 완전 휴식`

const SYSTEM_PROMPT = `당신은 뇌과학 기반 스케줄 최적화 AI입니다. 사용자의 할 일을 분석해서 가장 효율적인 시간대를 추천합니다.

뇌과학 스케줄링 원칙:
1. 아침 황금 시간 (07:00~09:00): 도파민·노르에피네프린 최고점 → 복잡한 학습, 암기, 언어 공부 최적
2. 오전 집중 시간 (10:00~12:00): 분석적 사고와 창의적 작업에 적합
3. 점심 이후 저조 (12:00~14:00): 서카디안 리듬 최저점 → 쉬운 반복 작업만 권장
4. 오후 회복 (15:00~17:00): 복습·창의 작업에 적합
5. 저녁 (20:00 이후): 가벼운 복습 가능, 새로운 학습은 비추

할 일 유형별 최적 시간:
- 언어 학습·암기: 아침 황금 시간 (수면이 기억 강화)
- 신체 운동: 이미 필라테스·드럼으로 채워져 있음
- 창의·예술(사운드 등): 오전 10~12시, 오후 15~17시
- 분석·공부: 아침 황금 시간 또는 오전

현재 고정 일정:
${FIXED_SCHEDULE}

규칙:
- 고정 일정과 겹치지 않는 시간대를 선택할 것
- 토요일·일요일은 가능하면 추천하지 말 것 (일요일은 절대 금지)
- 시간 형식은 반드시 HH:MM~HH:MM 형식으로

반드시 JSON만 반환하세요. 마크다운, 코드블록, 부가 설명 일절 없이:
{"day":"요일(월/화/수/목/금/토)","timeSlot":"HH:MM~HH:MM","category":"영어 또는 드럼 또는 필라테스 또는 사운드 또는 기타","taskText":"구체적인 할 일 텍스트(간결하게)","reason":"왜 이 시간이 뇌과학적으로 최적인지 2~3문장, 친근하고 격려하는 말투로"}`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { taskDescription, existingTasks = [] } = req.body

  if (!taskDescription?.trim()) {
    return res.status(400).json({ error: '할 일을 입력해주세요.' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const taskContext = existingTasks.length > 0
    ? `\n현재 할 일 목록:\n${existingTasks.map(t => `- ${t.text} (${t.category})`).join('\n')}`
    : ''

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: taskDescription.trim() + taskContext }],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock) {
      return res.status(500).json({ error: 'AI 응답을 받지 못했습니다.' })
    }

    const cleaned = textBlock.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const suggestion = JSON.parse(cleaned)
    return res.json({ suggestion })
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: 'API 키를 확인해주세요.' })
    }
    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI 응답 파싱 오류입니다. 다시 시도해주세요.' })
    }
    console.error('AI scheduling error:', error)
    return res.status(500).json({ error: 'AI 스케줄링 중 오류가 발생했습니다.' })
  }
}

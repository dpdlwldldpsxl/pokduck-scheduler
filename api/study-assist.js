import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { noteText } = req.body
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
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: `너는 학습 도우미야. 사용자가 오늘 배운 내용을 알려주면 즉시 학습 연계 자료를 만들어줘.

반드시 한국어로 답변해. 마크다운 쓰지 마. 이모지는 앞에만 사용.

이 형식으로 답변해:

📚 오늘 배운 것 정리
(핵심만 1~2줄)

💬 비슷한 표현/개념
(3~4개, 각각 한 줄로)

🔄 미니 복습
(배운 것 활용 예시 2~3개)

📝 추천 연습
(비슷한 난이도로 도전할 것 1~2개)

간결하게. 총 15줄 이내.` }] },
          contents: [
            { role: 'user', parts: [{ text: noteText }] },
          ],
          generationConfig: {
            maxOutputTokens: 500,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    const geminiData = await geminiRes.json()

    if (!geminiRes.ok) {
      console.error('Gemini error:', JSON.stringify(geminiData))
      return res.status(500).json({ error: '학습 자료 생성 실패', detail: geminiData?.error?.message || 'unknown' })
    }

    // thinking 모델은 parts가 여러 개일 수 있음
    const parts = geminiData.candidates?.[0]?.content?.parts || []
    const content = parts.filter((p) => p.text).map((p) => p.text).join('') || '...'
    return res.json({ content })
  } catch (error) {
    console.error('Study assist error:', error)
    return res.status(500).json({ error: '학습 자료 생성 실패', detail: error.message })
  }
}

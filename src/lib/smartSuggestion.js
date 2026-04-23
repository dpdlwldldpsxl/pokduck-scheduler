// 스마트 추천 엔진 — 오늘 탭의 suggestion을 데이터·시간대·리듬 기반으로 생성
//
// 원칙:
// - 원칙 6: 한 번에 추천 1개만 (결정 피로 제거)
// - 우선순위 기반: 가장 중요한 것 하나만 선택
// - 모든 추천은 구체적: "쉬어" X, "10분만 눈 감아봐" O
// - 시간대 반영: 코르티솔 리듬 기반 액션 추천
//
// 뇌과학 근거:
// - 코르티솔 최고점(9~11시): 논리/분석 최적
// - 울트라디안 리듬(90분 주기): 집중 + 휴식 밸런스
// - 에빙하우스 곡선: 1/3/7/14/30일 복습 타이밍
// - 점심 직후(13~14시): 집중력 저점, 단순 작업이 효율

function getKstHour() {
  const now = new Date()
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  return kst.getHours()
}

function getKstDateStr() {
  const now = new Date()
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  return kst.toISOString().split('T')[0]
}

export function getSmartSuggestion({
  displayName,
  todaySchedule = [],
  dueStudyNotes = [],
  habits = [],
  todayHabitLogs = [],
  todayMood = null,
  todayEnergy = null,
} = {}) {
  const hour = getKstHour()
  const today = getKstDateStr()

  // ─── 우선순위 100: 신체 경고 (아픔/피곤 누적)
  if (todayEnergy === 'sick') {
    return {
      emoji: '🤕',
      text: `${displayName}야, 오늘 아프다고 찍었네. 일정 최소만 하고 저녁 일찍 자자.`,
      action: null,
    }
  }

  // ─── 우선순위 95: 감정 경고 (번아웃)
  if (todayMood === 'burnout') {
    return {
      emoji: '😫',
      text: `번아웃이 온 하루. 지금 제일 큰 거 1개만 끝내고 나머지는 내일로 미뤄도 돼.`,
      action: null,
    }
  }

  // ─── 우선순위 90: 에빙하우스 복습 타이밍
  if (dueStudyNotes.length > 0) {
    const note = dueStudyNotes[0]
    const academy = note.academies?.name || '학원'
    const icon = note.academies?.icon || '📝'
    const reviewNum = (note.review_count || 0) + 1
    return {
      emoji: '🧠',
      text: `${icon} ${academy}에서 배운 "${note.title}" — 오늘이 ${reviewNum}회차 복습 타이밍. 2분만 훑어봐.`,
      action: { label: '복습하러 가기', path: '/goals' },
    }
  }

  // ─── 우선순위 85: 늦은 밤 (23시+)
  if (hour >= 23 || hour < 5) {
    return {
      emoji: '🌙',
      text: `늦었어. 내일을 위해 쉴 시간. 핸드폰 내려놓고 눈 감아봐.`,
      action: null,
    }
  }

  // ─── 우선순위 80: 저녁 복기 (19~22시)
  if (hour >= 19 && hour < 23) {
    const doneCount = todaySchedule.length
    return {
      emoji: '🌆',
      text: doneCount > 0
        ? `오늘 일정 ${doneCount}개 끝났네, 수고했어. 한 가지만 돌아봐 — 제일 기억에 남는 거 뭐야?`
        : `오늘 하루 어땠어? 쉬운 질문 하나 — 잘한 거 하나만 떠올려봐.`,
      action: { label: '폭덕이랑 대화', path: '/coaching' },
    }
  }

  // ─── 우선순위 75: 놓친 습관 (오후~초저녁, 움직일 수 있는 시간)
  const missedHabits = habits.filter((h) => !todayHabitLogs.includes(h.id))
  if (missedHabits.length > 0 && hour >= 14 && hour < 21) {
    const h = missedHabits[0]
    return {
      emoji: '🔥',
      text: `"${h.title}" 오늘 아직 안 했네. 지금 5분만 투자해보자.`,
      action: { label: '습관 체크', path: '/goals' },
    }
  }

  // ─── 우선순위 70: 오전 골든 타임 (9~11시, 코르티솔 피크)
  if (hour >= 9 && hour < 11) {
    const firstTodo = todaySchedule.find((s) => {
      const h = parseInt(s.start_time)
      return h >= 9 && h < 13
    })
    if (firstTodo) {
      return {
        emoji: '⚡',
        text: `지금이 집중 골든타임 (9~11시). ${firstTodo.title} 제대로 몰입할 각.`,
        action: null,
      }
    }
    return {
      emoji: '⚡',
      text: `9~11시는 뇌 논리 최고점이야. 제일 어려운 거 하나 지금 붙잡자.`,
      action: null,
    }
  }

  // ─── 우선순위 65: 점심 직후 저점 (13~14시)
  if (hour >= 13 && hour < 14) {
    return {
      emoji: '☕',
      text: `점심 직후는 집중력 저점. 단순 할 일(메일/정리)부터 하고 15시쯤 본격 일하자.`,
      action: null,
    }
  }

  // ─── 우선순위 60: 오후 창의 회복 (15~17시)
  if (hour >= 15 && hour < 17) {
    return {
      emoji: '🎨',
      text: `오후는 창의 회복 구간. 아이디어 필요한 작업이나 새로운 거 시도하기 좋아.`,
      action: null,
    }
  }

  // ─── 우선순위 55: 오늘 일정 기반 (기본 안내)
  if (todaySchedule.length >= 3) {
    return {
      emoji: '📅',
      text: `오늘 일정 ${todaySchedule.length}개. 빡센 하루인데 중간 5분 쉼 잊지 마 — 리듬 깨지면 저녁까지 영향 가.`,
      action: null,
    }
  }

  // 오전이면서 저녁 일정 있음
  if (hour < 12) {
    const evening = todaySchedule.find((s) => parseInt(s.start_time) >= 18)
    if (evening) {
      return {
        emoji: '🗓️',
        text: `저녁에 ${evening.title} 있으니까 오전에 할 일 먼저 정리하는 게 편해.`,
        action: null,
      }
    }
  }

  if (todaySchedule.length === 1) {
    return {
      emoji: '✨',
      text: `오늘은 ${todaySchedule[0].title}만 있으니까 여유롭네. 빈 시간에 복습이나 책 읽기 어때?`,
      action: { label: '기록 탭', path: '/goals' },
    }
  }

  if (todaySchedule.length === 0) {
    return {
      emoji: '🪴',
      text: `오늘 등록된 일정 없어. 쉼도 일정이야 — 편하게 보내도 괜찮아.`,
      action: null,
    }
  }

  // ─── 기본 메시지
  return {
    emoji: '🦆',
    text: `오늘도 한 걸음씩. ${displayName}야 화이팅!`,
    action: null,
  }
}

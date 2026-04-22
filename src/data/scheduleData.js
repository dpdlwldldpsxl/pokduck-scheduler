export const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export function getTodayInfo() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const dayIndex = now.getDay()
  const dayName = DAYS[dayIndex]
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${dayName})`
  return { dayName, dateStr, dayIndex }
}

export const POKDUCK_IMAGES = {
  default:   '/images/pokduck_default.png',
  happy:     '/images/pokduck_happy.jpeg',
  celebrate: '/images/pokduck_celebrate.jpeg',
  cheer:     '/images/pokduck_cheer.png',
  rest:      '/images/pokduck_rest.jpeg',
  remind:    '/images/pokduck_remind.jpeg',
}

export const FIXED_SCHEDULE = {
  '월': [
    { time: '08:05', text: '영어 회화 수업' },
    { time: '09:00', text: '출근' },
    { time: '20:00', text: '필라테스' },
  ],
  '화': [
    { time: '07:00', text: '아침 공부 시간 (1.5시간)' },
    { time: '09:00', text: '출근' },
  ],
  '수': [
    { time: '08:05', text: '영어 회화 수업' },
    { time: '09:00', text: '출근' },
    { time: '20:00', text: '필라테스' },
  ],
  '목': [
    { time: '07:00', text: '아침 공부 시간 (1.5시간)' },
    { time: '09:00', text: '출근' },
    { time: '19:00', text: '사운드 디자인 레슨' },
  ],
  '금': [
    { time: '07:00', text: '아침 공부 시간 (1.5시간)' },
    { time: '09:00', text: '출근' },
  ],
  '토': [
    { time: '11:00', text: '필라테스' },
    { time: '15:00', text: '드럼 레슨' },
  ],
  '일': [
    { time: '🦆', text: '완전 휴식의 날! 폭덕이도 쉬어요~' },
  ],
}

const DAILY_CHEERS_POOL = [
  '오늘도 멋진 하루가 될 거야! 폭덕이가 응원해!',
  '어제보다 오늘이 더 나은 하루가 될 거야!',
  '작은 것부터 하나씩! 그게 제일 잘하는 거야.',
  '피곤해도 괜찮아. 시작만 하면 돼!',
  '오늘 할 일 다 못해도 괜찮아. 한 개만 해도 대단한 거야!',
  '폭덕이가 옆에서 지켜보고 있을게. 화이팅!',
  '잘하고 있어! 스스로한테 칭찬 한 번 해줘.',
  '오늘 하루도 넌 충분히 잘하고 있어!',
  '쉬엄쉬엄 해도 돼. 중요한 건 포기 안 하는 거야.',
  '넌 생각보다 훨씬 대단한 사람이야. 폭덕이 말 믿어!',
  '오늘 기분이 별로여도 괜찮아. 내일은 더 나을 거야.',
  '한 걸음씩! 거북이도 결국 도착하잖아 🐢',
]

const WEEKEND_CHEERS = [
  '주말이다! 푹 쉬면서 충전하자.',
  '오늘은 하고 싶은 것만 하는 날!',
  '가끔은 아무것도 안 하는 게 최고야.',
  '주말은 폭덕이도 쉬는 날... 이라고 할 뻔!',
]

export function getDailyMessage() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const day = now.getDay()
  const seed = now.getFullYear() * 1000 + now.getMonth() * 32 + now.getDate()
  if (day === 0 || day === 6) {
    return { msg: WEEKEND_CHEERS[seed % WEEKEND_CHEERS.length], mood: day === 0 ? 'rest' : 'happy' }
  }
  return { msg: DAILY_CHEERS_POOL[seed % DAILY_CHEERS_POOL.length], mood: 'cheer' }
}

// 레거시 호환용 (제거 예정)
export const POKDUCK_DAY_CONFIG = {
  '월': { msg: '', mood: 'cheer' },
  '화': { msg: '', mood: 'cheer' },
  '수': { msg: '', mood: 'default' },
  '목': { msg: '', mood: 'cheer' },
  '금': { msg: '', mood: 'happy' },
  '토': { msg: '', mood: 'cheer' },
  '일': { msg: '', mood: 'rest' },
}

export const WEEK_TAGS = {
  '월': [
    { label: '영어', cls: 'tag-english' },
    { label: '필라테스', cls: 'tag-pilates' },
  ],
  '화': [
    { label: '야근가능성 있음', cls: 'tag-work' },
  ],
  '수': [
    { label: '영어', cls: 'tag-english' },
    { label: '필라테스', cls: 'tag-pilates' },
  ],
  '목': [
    { label: '사운드', cls: 'tag-sound' },
  ],
  '금': [
    { label: '자유', cls: 'tag-free' },
  ],
  '토': [
    { label: '필라테스', cls: 'tag-pilates' },
    { label: '드럼', cls: 'tag-drum' },
  ],
  '일': [
    { label: '휴식', cls: 'tag-rest' },
  ],
}

export const CHEERS = [
  '하나 완료! 잘하고 있어, 계속 가자!',
  '굿굿! 폭덕이가 지켜보고 있어!',
  '오 체크! 이 기세로 쭉 가봐!',
  '완료! 폭덕이도 같이 기뻐!',
]

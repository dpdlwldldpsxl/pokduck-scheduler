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

export const POKDUCK_DAY_CONFIG = {
  '월': { msg: '월요일이다! 영어 수업 준비됐어? 오늘 필라테스도 있어. 화이팅!', mood: 'cheer' },
  '화': { msg: '아침 황금 1.5시간! 오늘 공부하기 제일 좋은 날이야.', mood: 'cheer' },
  '수': { msg: '수요일! 영어 수업 + 필라테스. 사이에 잠깐 쉬어도 돼.', mood: 'default' },
  '목': { msg: '오늘 저녁엔 사운드 디자인 레슨! 아침 시간 활용해봐.', mood: 'cheer' },
  '금': { msg: '금요일이다! 아침에 이번 주 마무리하고, 저녁은 진짜 쉬어~', mood: 'happy' },
  '토': { msg: '토요일! 필라테스 11시, 드럼 3시. 오늘도 잘 할 수 있어! 🥁', mood: 'cheer' },
  '일': { msg: '오늘은 쉬는 날이야. 아무것도 안 해도 돼. 폭덕이 명령이야!', mood: 'rest' },
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

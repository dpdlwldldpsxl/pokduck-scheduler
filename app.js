// ── 인트로 동영상 ──
function initIntro() {
  const overlay = document.getElementById('intro-overlay');
  const video = document.getElementById('intro-video');

  // 동영상 파일 없으면 인트로 건너뜀
  video.addEventListener('error', () => {
    overlay.remove();
  });

  // 동영상 끝나면 자동으로 사라짐
  video.addEventListener('ended', () => {
    closeIntro();
  });

  // 탭/클릭하면 건너뛰기
  overlay.addEventListener('click', () => {
    closeIntro();
  });

  video.play().catch(() => {
    // 자동재생 막혀도 버튼으로 건너뛸 수 있음
  });

  // 동영상 없는 환경이면 0.5초 후 자동으로 넘어감
  setTimeout(() => {
    if (document.getElementById('intro-overlay')) {
      const v = document.getElementById('intro-video');
      if (v.readyState === 0) closeIntro();
    }
  }, 500);
}

function closeIntro() {
  const overlay = document.getElementById('intro-overlay');
  overlay.classList.add('fade-out');
  setTimeout(() => overlay.remove(), 500);
}

// ── 축하 동영상 ──
function showCelebrate() {
  const overlay = document.getElementById('celebrate-overlay');
  const video = document.getElementById('celebrate-video');

  // 동영상 없으면 텍스트만 보여줌
  video.addEventListener('error', () => {
    video.style.display = 'none';
  });

  overlay.classList.remove('hidden');
  video.play().catch(() => {});
}

function closeCelebrate() {
  const overlay = document.getElementById('celebrate-overlay');
  const video = document.getElementById('celebrate-video');
  video.pause();
  overlay.classList.add('hidden');
}

// 오늘 날짜 표시
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getTodayInfo() {
  const now = new Date();
  const dayIndex = now.getDay();
  const dayName = DAYS[dayIndex];
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${dayName})`;
  return { dayName, dateStr, dayIndex };
}

// ── 폭덕이 이미지 상태 ──
// images 폴더에 아래 파일명으로 사진 넣으면 상황마다 자동으로 바뀜!
const POKDUCK_IMAGES = {
  default:   'images/pokduck_default.png',   // 기본 인사
  happy:     'images/pokduck_happy.jpeg',    // 할 일 하나 완료할 때
  celebrate: 'images/pokduck_celebrate.jpeg',// 오늘 할 일 전부 완료!
  cheer:     'images/pokduck_cheer.png',     // 응원/격려
  rest:      'images/pokduck_rest.jpeg',     // 일요일 휴식
  remind:    'images/pokduck_remind.jpeg',   // 마감 임박 경고
};

// 이미지 바꾸기 (파일 없으면 기본 이미지 유지)
function setPokduckImage(mood) {
  const img = document.getElementById('pokduck-img');
  const src = POKDUCK_IMAGES[mood] || POKDUCK_IMAGES.default;

  const testImg = new Image();
  testImg.onload = () => {
    img.classList.add('duck-switch');
    setTimeout(() => {
      img.src = src;
      img.classList.remove('duck-switch');
    }, 150);
  };
  testImg.src = src;
}

// ── 요일별 고정 일정 (4월 기준) ──
const FIXED_SCHEDULE = {
  '월': [
    { time: '07:00', text: '영어 회화 수업' },
    { time: '09:00', text: '출근' },
    { time: '20:00', text: '필라테스' },
  ],
  '화': [
    { time: '07:00', text: '아침 공부 시간 (1.5시간)' },
    { time: '09:00', text: '출근' },
  ],
  '수': [
    { time: '07:00', text: '영어 회화 수업' },
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
};

// ── 폭덕이 메시지 & 이미지 (요일별) ──
const POKDUCK_DAY_CONFIG = {
  '월': { msg: '월요일이다! 영어 수업 준비됐어? 오늘 필라테스도 있어. 화이팅!', mood: 'cheer' },
  '화': { msg: '아침 황금 1.5시간! 오늘 공부하기 제일 좋은 날이야.', mood: 'cheer' },
  '수': { msg: '수요일! 영어 수업 + 필라테스. 사이에 잠깐 쉬어도 돼.', mood: 'default' },
  '목': { msg: '오늘 저녁엔 사운드 디자인 레슨! 아침 시간 활용해봐.', mood: 'cheer' },
  '금': { msg: '금요일이다! 아침에 이번 주 마무리하고, 저녁은 진짜 쉬어~', mood: 'happy' },
  '토': { msg: '토요일! 필라테스 11시, 드럼 3시. 오늘도 잘 할 수 있어! 🥁', mood: 'cheer' },
  '일': { msg: '오늘은 쉬는 날이야. 아무것도 안 해도 돼. 폭덕이 명령이야!', mood: 'rest' },
};

function setMessage(text) {
  document.getElementById('pokduck-message').textContent = text;
}

// ── 오늘 일정 렌더링 ──
function renderTodaySchedule(dayName) {
  const list = document.getElementById('today-schedule');
  const items = FIXED_SCHEDULE[dayName] || [];
  if (items.length === 0) {
    list.innerHTML = '<li class="schedule-empty">일정 없음</li>';
    return;
  }
  list.innerHTML = items.map(item => `
    <li>
      <span class="schedule-time">${item.time}</span>
      <span>${item.text}</span>
    </li>
  `).join('');
}

// ── 오늘 요일 강조 ──
function highlightToday(dayName) {
  const box = document.getElementById(`day-${dayName}`);
  if (box) box.classList.add('today');
}

// ── 할 일 관리 ──
function loadTasks() {
  return JSON.parse(localStorage.getItem('pokduck-tasks') || '[]');
}

function saveTasks(tasks) {
  localStorage.setItem('pokduck-tasks', JSON.stringify(tasks));
}

function renderTasks() {
  const tasks = loadTasks();
  const list = document.getElementById('task-list');

  if (tasks.length === 0) {
    list.innerHTML = '<li style="color:#aaa;font-size:14px;padding:8px 0;">아직 할 일이 없어요!</li>';
    return;
  }

  list.innerHTML = tasks.map((task, i) => `
    <li class="${task.done ? 'done' : ''}">
      <div class="task-check ${task.done ? 'checked' : ''}" onclick="toggleTask(${i})">
        ${task.done ? '✓' : ''}
      </div>
      <span class="task-text">${task.text}</span>
      <span class="task-cat cat-${task.category}">${task.category}</span>
      <span class="task-delete" onclick="deleteTask(${i})">×</span>
    </li>
  `).join('');
}

function addTask() {
  const input = document.getElementById('task-input');
  const category = document.getElementById('task-category').value;
  const text = input.value.trim();
  if (!text) return;

  const tasks = loadTasks();
  tasks.push({ text, category, done: false });
  saveTasks(tasks);
  input.value = '';
  renderTasks();
}

function toggleTask(index) {
  const tasks = loadTasks();
  tasks[index].done = !tasks[index].done;
  saveTasks(tasks);
  renderTasks();

  if (tasks[index].done) {
    const allDone = tasks.every(t => t.done);
    if (allDone) {
      // 전부 완료!
      setMessage('오늘 할 일 다 했어?! 최고야!!! 폭덕이가 너무 자랑스러워!! 🎉');
      setPokduckImage('celebrate');
      showCelebrate();
    } else {
      // 하나 완료 - 랜덤 칭찬
      const cheers = [
        '하나 완료! 잘하고 있어, 계속 가자!',
        '굿굿! 폭덕이가 지켜보고 있어!',
        '오 체크! 이 기세로 쭉 가봐!',
        '완료! 폭덕이도 같이 기뻐!',
      ];
      setMessage(cheers[Math.floor(Math.random() * cheers.length)]);
      setPokduckImage('happy');
    }
  } else {
    // 체크 취소 - 원래 상태로
    const { dayName } = getTodayInfo();
    const config = POKDUCK_DAY_CONFIG[dayName];
    setMessage(config.msg);
    setPokduckImage(config.mood);
  }
}

function deleteTask(index) {
  const tasks = loadTasks();
  tasks.splice(index, 1);
  saveTasks(tasks);
  renderTasks();
}

// 엔터키로 추가
document.getElementById('task-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addTask();
});

// ── 초기 실행 ──
initIntro();
const { dayName, dateStr } = getTodayInfo();
document.getElementById('today-date').textContent = dateStr;

const todayConfig = POKDUCK_DAY_CONFIG[dayName];
setMessage(todayConfig.msg);
setPokduckImage(todayConfig.mood);

renderTodaySchedule(dayName);
highlightToday(dayName);
renderTasks();

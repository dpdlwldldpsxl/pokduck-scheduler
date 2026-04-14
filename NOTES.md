# 폭덕이 스케줄러 — 기술 메모

## 1. 날짜 및 시간대

`getTodayInfo()` 함수는 `new Date()`를 사용한다.

```js
const now = new Date();
```

`new Date()`는 **브라우저가 실행되는 기기의 로컬 시간**을 따른다.
별도로 timezone을 지정하지 않으므로, **서울(KST, UTC+9)로 고정되어 있지 않다.**

| 상황 | 결과 |
|---|---|
| 기기 시간대가 서울(KST)로 설정된 경우 | 서울 시간 기준으로 정상 동작 |
| 기기 시간대가 다른 경우 (예: UTC, 미국 등) | 해당 기기 시간 기준으로 동작 |

**서울 시간으로 강제 고정하려면** 아래처럼 수정해야 한다:

```js
function getTodayInfo() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  // ...
}
```

현재는 로컬 기기가 서울 시간대이면 문제없이 동작한다.

---

## 2. 데이터 저장 방식

모든 데이터는 **브라우저 localStorage**에 저장된다.

### 저장 키

| 키 | 내용 |
|---|---|
| `pokduck-tasks` | 할 일 목록 |

### 데이터 구조

```json
[
  {
    "text": "영어 단어 외우기",
    "category": "영어",
    "done": false
  },
  {
    "text": "드럼 연습",
    "category": "드럼",
    "done": true
  }
]
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `text` | string | 할 일 내용 |
| `category` | string | 영어 / 드럼 / 필라테스 / 사운드 / 기타 |
| `done` | boolean | 완료 여부 |

### 저장/불러오기 함수

```js
// 불러오기
function loadTasks() {
  return JSON.parse(localStorage.getItem('pokduck-tasks') || '[]');
}

// 저장
function saveTasks(tasks) {
  localStorage.setItem('pokduck-tasks', JSON.stringify(tasks));
}
```

### 주의사항

- localStorage는 **같은 브라우저, 같은 도메인(localhost:3000)**에서만 공유된다.
- 브라우저 데이터를 삭제하면 할 일 목록도 사라진다.
- 다른 기기나 다른 브라우저에서는 데이터가 동기화되지 않는다.
- 요일별 고정 일정(`FIXED_SCHEDULE`)은 localStorage가 아닌 **코드에 하드코딩**되어 있어 항상 유지된다.

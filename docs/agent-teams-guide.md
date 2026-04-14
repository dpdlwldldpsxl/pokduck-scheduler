# Claude Code 에이전트 팀 가이드

> 여러 Claude Code 인스턴스를 조율하여 병렬로 작업하게 하는 기능

---

## 1. 에이전트 팀이란?

- 한 세션이 **팀 리더** 역할을 하고, 여러 **팀원**이 독립적으로 작업
- 팀원끼리 **직접 통신** 가능 (subagent는 메인에게만 보고)
- 공유 **작업 목록**으로 조율
- 각 팀원은 자신만의 **컨텍스트 윈도우** 보유

---

## 2. 활성화 방법

`.claude/settings.local.json` 또는 `.claude/settings.json`에 추가:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

> Claude Code v2.1.32 이상 필요. `claude --version`으로 확인.

---

## 3. Subagent vs 에이전트 팀

| | Subagents | 에이전트 팀 |
|---|---|---|
| **컨텍스트** | 결과를 호출자에게 반환 | 완전히 독립적 |
| **통신** | 메인에게만 보고 | 팀원끼리 직접 메시지 |
| **조율** | 메인이 모든 작업 관리 | 공유 작업 목록으로 자체 조율 |
| **최적 용도** | 결과만 중요한 집중 작업 | 논의/협업이 필요한 복잡한 작업 |
| **토큰 비용** | 낮음 | 높음 (각 팀원이 별도 인스턴스) |

**선택 기준**: 워커들이 서로 통신해야 하면 에이전트 팀, 아니면 subagent.

---

## 4. 팀 시작하기

자연어로 요청하면 됨:

```
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Create an agent team to explore this from different angles:
one teammate on UX, one on technical architecture, one playing devil's advocate.
```

Claude가 알아서:
1. 팀 생성
2. 팀원 생성
3. 작업 목록 생성 및 할당
4. 완료 후 결과 종합

---

## 5. 팀 제어하기

### 5.1 표시 모드

| 모드 | 설명 | 요구사항 |
|---|---|---|
| **In-process** (기본) | 메인 터미널 내에서 실행. `Shift+Down`으로 팀원 순환 | 없음 |
| **분할 창** | 각 팀원이 자신의 창 보유 | tmux 또는 iTerm2 |

설정 방법 (`~/.claude.json`):
```json
{
  "teammateMode": "in-process"
}
```

또는 플래그로:
```bash
claude --teammate-mode in-process
```

### 5.2 팀원 및 모델 지정

```
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### 5.3 계획 승인 요구

```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

- 팀원이 계획 작성 -> 리더가 검토 -> 승인/거부
- 거부 시 피드백에 따라 수정 후 재제출

### 5.4 팀원과 직접 대화

- **In-process**: `Shift+Down`으로 순환 후 입력
- **분할 창**: 팀원 창 클릭

### 5.5 작업 할당

작업 상태: **대기 중** -> **진행 중** -> **완료됨**

- **리더 할당**: 리더에게 어떤 작업을 누구에게 줄지 지시
- **자체 요청**: 팀원이 완료 후 다음 미할당 작업 자동 선택

### 5.6 팀원 종료

```
Ask the researcher teammate to shut down
```

### 5.7 팀 정리

```
Clean up the team
```

> 항상 **리더**를 통해 정리. 팀원이 정리하면 리소스가 일관성 없는 상태로 남을 수 있음.

---

## 6. 아키텍처

| 구성 요소 | 역할 |
|---|---|
| **팀 리더** | 팀 생성, 팀원 생성, 작업 조율하는 메인 세션 |
| **팀원** | 할당된 작업을 독립적으로 수행하는 별도 인스턴스 |
| **작업 목록** | 공유 작업 항목 목록 |
| **메일박스** | 에이전트 간 메시징 시스템 |

저장 위치:
- 팀 구성: `~/.claude/teams/{team-name}/config.json`
- 작업 목록: `~/.claude/tasks/{team-name}/`

### Subagent 정의를 팀원으로 사용

```
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

팀원은 해당 subagent의 시스템 프롬프트, 도구, 모델을 상속.

---

## 7. 사용 사례 예시

### 병렬 코드 검토

```
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### 경쟁 가설로 디버깅

```
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk to
each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

---

## 8. Hooks로 품질 게이트

| Hook | 시점 | 용도 |
|---|---|---|
| `TeammateIdle` | 팀원이 유휴 상태가 될 때 | 종료코드 2로 피드백 전송, 계속 작동 |
| `TaskCreated` | 작업 생성 시 | 종료코드 2로 생성 방지 |
| `TaskCompleted` | 작업 완료 표시 시 | 종료코드 2로 완료 방지 |

---

## 9. 모범 사례

### 충분한 컨텍스트 제공
팀원은 리더의 대화 기록을 상속하지 않음. 생성 프롬프트에 구체적 세부사항 포함:

```
Spawn a security reviewer teammate with the prompt: "Review the authentication
module at src/auth/ for security vulnerabilities. Focus on token handling,
session management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

### 적절한 팀 크기
- **3~5명**으로 시작 (대부분의 워크플로우)
- 팀원당 **5~6개 작업** 유지
- 3명의 집중된 팀원 > 5명의 산만한 팀원

### 작업 크기 조정
- **너무 작으면**: 조율 오버헤드가 이점 초과
- **너무 크면**: 체크인 없이 너무 오래 작동
- **적절함**: 함수, 테스트 파일 등 명확한 결과물이 있는 자체 포함 단위

### 파일 충돌 피하기
두 팀원이 같은 파일 편집 -> 덮어쓰기 발생. 각 팀원이 다른 파일 집합을 소유하도록 분리.

### 팀원 완료 대기
리더가 먼저 구현 시작할 때:
```
Wait for your teammates to complete their tasks before proceeding
```

---

## 10. 문제 해결

| 문제 | 해결 |
|---|---|
| 팀원이 안 보임 | `Shift+Down`으로 확인 / tmux 설치 확인 (`which tmux`) |
| 권한 프롬프트 과다 | 미리 권한 설정에서 일반 작업 사전 승인 |
| 팀원 오류로 중지 | 직접 추가 지시 제공 또는 대체 팀원 생성 |
| 리더가 조기 종료 | "계속해" 지시 / "팀원들 완료될 때까지 기다려" |
| 고아 tmux 세션 | `tmux ls` -> `tmux kill-session -t <name>` |

---

## 11. 제한 사항

- In-process 팀원은 세션 재개(`/resume`, `/rewind`) 불가
- 작업 상태가 지연될 수 있음 (팀원이 완료 표시 누락)
- 종료가 느릴 수 있음
- **세션당 한 팀**만 가능
- **중첩된 팀 불가** (팀원이 자기 팀 생성 불가)
- **리더 고정** (리더십 이전 불가)
- 분할 창은 VS Code 통합 터미널, Windows Terminal에서 미지원

---

## 12. 권한

- 팀원은 리더의 권한 설정으로 시작
- 리더가 `--dangerously-skip-permissions`이면 팀원도 동일
- 생성 후 개별 팀원 모드 변경 가능

---

## 13. 통신 방식

- **자동 메시지 전달**: 팀원 메시지가 수신자에게 자동 전달
- **유휴 알림**: 팀원 완료 시 리더에게 자동 알림
- **공유 작업 목록**: 모든 에이전트가 작업 상태 확인 가능
- **message**: 특정 팀원 1명에게 메시지
- **broadcast**: 모든 팀원에게 동시 전송 (비용 주의)

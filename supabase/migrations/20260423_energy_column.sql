-- 에너지 (신체 컨디션) 컬럼 추가
-- 2026-04-23 추가 (Phase B-0 확장)
-- mood_logs 테이블에 에너지 1탭을 같이 저장. 하루 1행.
--
-- 원칙: mood, energy 둘 다 독립적으로 선택 가능 (둘 다 nullable)
-- - 유저가 기분만 찍거나 / 에너지만 찍거나 / 둘 다 찍거나
-- - 앱 레벨에서는 최소 하나는 있다고 가정 (빈 행 안 들어옴)

-- mood를 nullable로 변경
alter table public.mood_logs alter column mood drop not null;

-- energy 컬럼 추가
alter table public.mood_logs
  add column if not exists energy text
  check (energy in ('tired', 'normal', 'good', 'foggy', 'sick'));

-- 기분 로그 테이블
-- 2026-04-23 추가 (Phase B-0)
-- 하루에 한 기분. 같은 날 다시 누르면 덮어씀(upsert).

create table if not exists public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null check (mood in ('burnout', 'angry', 'complex', 'calm', 'happy')),
  logged_at date not null default ((now() at time zone 'Asia/Seoul')::date),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 유저별 날짜당 1개만 허용
create unique index if not exists mood_logs_user_date_idx
  on public.mood_logs(user_id, logged_at);

-- 조회 속도용 인덱스
create index if not exists mood_logs_user_recent_idx
  on public.mood_logs(user_id, logged_at desc);

-- RLS 활성화
alter table public.mood_logs enable row level security;

-- 유저 본인 데이터만 접근
create policy "Users can read own moods" on public.mood_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own moods" on public.mood_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own moods" on public.mood_logs
  for update using (auth.uid() = user_id);

create policy "Users can delete own moods" on public.mood_logs
  for delete using (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
create or replace function public.mood_logs_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mood_logs_touch_updated_at on public.mood_logs;
create trigger mood_logs_touch_updated_at
  before update on public.mood_logs
  for each row execute function public.mood_logs_touch_updated_at();

-- =========================================================================
-- Схема БД для админ-панели заявок музыкальной школы
-- Выполните этот скрипт в Supabase SQL Editor (Database → SQL Editor → New query)
-- =========================================================================

-- Тип статуса заявки
do $$ begin
  create type request_status as enum ('new', 'in_progress', 'done');
exception
  when duplicate_object then null;
end $$;

-- -------------------------------------------------------------------------
-- Таблица 1: заявки на пробный урок
-- -------------------------------------------------------------------------
create table if not exists public.trial_lesson_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  direction   text not null check (direction in ('piano','guitar','vocal')),
  age         int  not null check (age between 3 and 99),
  time        text,
  status      request_status not null default 'new',
  created_at  timestamptz not null default now()
);

create index if not exists trial_lesson_requests_created_at_idx
  on public.trial_lesson_requests (created_at desc);

-- -------------------------------------------------------------------------
-- Таблица 2: заявки на консультацию по преподавателю
-- -------------------------------------------------------------------------
create table if not exists public.teacher_consultation_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  status      request_status not null default 'new',
  created_at  timestamptz not null default now()
);

create index if not exists teacher_consultation_requests_created_at_idx
  on public.teacher_consultation_requests (created_at desc);

-- -------------------------------------------------------------------------
-- Row Level Security
--   - INSERT разрешён анонимам (для отправки форм с сайта).
--   - SELECT/UPDATE/DELETE — без политик для роли anon, поэтому anon
--     их не выполнит. Админ-операции делаются serverless-функцией
--     через service_role ключ, который обходит RLS.
-- -------------------------------------------------------------------------
alter table public.trial_lesson_requests enable row level security;
alter table public.teacher_consultation_requests enable row level security;

drop policy if exists "anon insert trial" on public.trial_lesson_requests;
create policy "anon insert trial"
  on public.trial_lesson_requests
  for insert
  to anon
  with check (true);

drop policy if exists "anon insert consultation" on public.teacher_consultation_requests;
create policy "anon insert consultation"
  on public.teacher_consultation_requests
  for insert
  to anon
  with check (true);

-- Готово. После выполнения скрипта:
--   1) Создайте пользователя-админа в Authentication → Users → Add user.
--   2) Заполните .env (см. .env.example).
--   3) Задеплойте на Vercel.

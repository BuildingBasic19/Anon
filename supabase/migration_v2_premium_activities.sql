-- ============================================================
-- HBTU Anon — v2 migration: Premium (Anon+), Payments, Activity Buddy
-- Run this AFTER schema.sql, in Supabase SQL Editor.
-- Safe to run once on top of the original schema.
-- ============================================================

-- 1. PREMIUM STATUS ON PROFILES ------------------------------------
alter table profiles add column if not exists is_premium boolean not null default false;
alter table profiles add column if not exists premium_until timestamptz;

-- 2. PAYMENTS ---------------------------------------------------------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan text not null,                      -- 'anon_plus_monthly' | 'activity_boost'
  amount_paise int not null,               -- store paise (INR) to avoid float issues
  razorpay_order_id text not null,
  razorpay_payment_id text,
  status text not null default 'created',  -- created | paid | failed
  created_at timestamptz not null default now()
);

alter table payments enable row level security;
create policy "read own payments" on payments for select using (auth.uid() = user_id);
-- No insert/update policy for regular users on purpose: only the server,
-- using the service-role key (which bypasses RLS), is allowed to write here.
-- That means a user can never fake their own "paid" status from the browser.

-- 3. MOVIE / ACTIVITY BUDDY --------------------------------------------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  activity_type text not null default 'movie',  -- movie | outing | study | sport | other
  title text not null,
  description text,
  planned_time text,                -- free text, e.g. "Sat 6pm"
  is_boosted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists activity_interests (
  activity_id uuid not null references activities(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

alter table activities enable row level security;
alter table activity_interests enable row level security;

create policy "read activities" on activities for select using (true);
create policy "create own activity" on activities for insert with check (auth.uid() = author_id);

create policy "read own interests or as author" on activity_interests for select
  using (
    auth.uid() = user_id
    or exists (select 1 from activities a where a.id = activity_id and a.author_id = auth.uid())
  );
create policy "express interest" on activity_interests for insert with check (auth.uid() = user_id);

-- Let a user open a direct 1-1 room with someone (used to connect an
-- activity's author with an interested person). Previously chat_rooms
-- could only be created via the find_match() function.
create policy "create own room" on chat_rooms for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

-- 4. PREMIUM-AWARE RANDOM CHAT MATCHING ---------------------------------
-- Free users: pure random match, interest is ignored.
-- Premium (Anon+) users: matched with someone sharing the same interest
-- first, falling back to random only if nobody with that interest is
-- currently waiting. This is the "pay to find people with your interest"
-- feature.
create or replace function find_match(requesting_user uuid)
returns uuid as $$
declare
  partner uuid;
  room_id uuid;
  requester_premium boolean;
  requester_interest text;
begin
  select is_premium into requester_premium from profiles where id = requesting_user;
  select interest into requester_interest from chat_queue where user_id = requesting_user;

  if requester_premium and requester_interest is not null then
    select user_id into partner
    from chat_queue
    where user_id <> requesting_user
      and interest = requester_interest
    order by joined_at
    for update skip locked
    limit 1;
  end if;

  if partner is null then
    select user_id into partner
    from chat_queue
    where user_id <> requesting_user
    order by joined_at
    for update skip locked
    limit 1;
  end if;

  if partner is null then
    return null;
  end if;

  delete from chat_queue where user_id in (partner, requesting_user);

  insert into chat_rooms (user1_id, user2_id)
  values (requesting_user, partner)
  returning id into room_id;

  return room_id;
end;
$$ language plpgsql security definer;

-- 5. REALTIME for the new activities table -------------------------------
alter publication supabase_realtime add table activities;

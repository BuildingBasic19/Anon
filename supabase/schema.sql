-- ============================================================
-- HBTU Anon — Supabase schema
-- Run this in Supabase SQL editor (Project > SQL Editor > New query)
-- ============================================================

-- 1. PROFILES ---------------------------------------------------
-- One row per authenticated user. anon_handle is the ONLY thing
-- ever shown to other users. Email/name never leave this table.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  anon_handle text unique not null,
  college_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile with a random handle whenever someone signs up
create or replace function handle_new_user()
returns trigger as $$
declare
  domain text;
  handle text;
begin
  domain := split_part(new.email, '@', 2);

  -- CHANGE THIS to your real HBTU student email domain
  if domain <> 'hbtu.ac.in' then
    raise exception 'Only HBTU email addresses are allowed';
  end if;

  handle := 'Anon#' || floor(random() * 9000 + 1000)::int;

  insert into profiles (id, anon_handle, college_verified)
  values (new.id, handle, true);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 2. WALL: POSTS / COMMENTS / VOTES ------------------------------
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  category text not null default 'general',
  content text not null,
  upvotes int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists post_votes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create or replace function increment_upvote(p_post_id uuid)
returns void as $$
begin
  update posts set upvotes = upvotes + 1 where id = p_post_id;
end;
$$ language plpgsql security definer;

-- 3. RANDOM ANONYMOUS CHAT ----------------------------------------
create table if not exists chat_queue (
  user_id uuid primary key references profiles(id) on delete cascade,
  interest text,
  joined_at timestamptz not null default now()
);

create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references profiles(id) on delete cascade,
  user2_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Atomic matchmaking: call this after inserting yourself into chat_queue.
-- Uses SKIP LOCKED so two people joining at the same instant can't both
-- grab the same partner.
create or replace function find_match(requesting_user uuid)
returns uuid as $$
declare
  partner uuid;
  room_id uuid;
begin
  select user_id into partner
  from chat_queue
  where user_id <> requesting_user
  order by joined_at
  for update skip locked
  limit 1;

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

-- 4. INTEREST GROUPS -----------------------------------------------
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- 5. ROW LEVEL SECURITY ----------------------------------------------
alter table profiles enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table post_votes enable row level security;
alter table chat_queue enable row level security;
alter table chat_rooms enable row level security;
alter table messages enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_messages enable row level security;

-- Everyone verified can read anon_handles (needed to render posts),
-- but can only ever see the handle column via the app queries below.
create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "read any handle" on profiles for select using (true);

create policy "read posts" on posts for select using (true);
create policy "insert own posts" on posts for insert with check (auth.uid() = author_id);

create policy "read comments" on comments for select using (true);
create policy "insert own comments" on comments for insert with check (auth.uid() = author_id);

create policy "read votes" on post_votes for select using (true);
create policy "insert own vote" on post_votes for insert with check (auth.uid() = user_id);

create policy "manage own queue row" on chat_queue for all using (auth.uid() = user_id);

create policy "read own rooms" on chat_rooms for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "read room messages" on messages for select
  using (
    exists (
      select 1 from chat_rooms r
      where r.id = messages.room_id
      and (r.user1_id = auth.uid() or r.user2_id = auth.uid())
    )
  );
create policy "send room messages" on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from chat_rooms r
      where r.id = room_id
      and (r.user1_id = auth.uid() or r.user2_id = auth.uid())
    )
  );

create policy "read groups" on groups for select using (true);
create policy "create groups" on groups for insert with check (auth.uid() = created_by);

create policy "read own memberships" on group_members for select using (true);
create policy "join groups" on group_members for insert with check (auth.uid() = user_id);

create policy "read group messages if member" on group_messages for select
  using (exists (select 1 from group_members m where m.group_id = group_messages.group_id and m.user_id = auth.uid()));
create policy "send group messages if member" on group_messages for insert
  with check (
    auth.uid() = sender_id and
    exists (select 1 from group_members m where m.group_id = group_id and m.user_id = auth.uid())
  );

-- Enable realtime on the tables the frontend subscribes to
alter publication supabase_realtime add table messages, chat_rooms, posts, group_messages;

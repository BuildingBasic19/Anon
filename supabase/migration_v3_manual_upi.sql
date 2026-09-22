-- ============================================================
-- HBTU Anon — v3 migration: Manual UPI payment approvals
-- Run this in Supabase SQL Editor, after schema.sql and
-- migration_v2_premium_activities.sql.
--
-- This replaces automatic Razorpay verification with a manual flow:
-- a student pays you directly via UPI (FamPay, GPay, PhonePe, anything),
-- submits the transaction reference here, and you approve it from
-- /admin/payments. Approving is what actually flips is_premium / is_boosted.
-- ============================================================

create table if not exists payment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan text not null,                 -- 'anon_plus_monthly' | 'activity_boost'
  activity_id uuid references activities(id) on delete cascade, -- only for activity_boost
  amount_rupees numeric not null,
  utr_reference text not null,        -- the UPI transaction ref the student typed in
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table payment_submissions enable row level security;

create policy "read own submissions" on payment_submissions for select using (auth.uid() = user_id);
create policy "create own submission" on payment_submissions for insert with check (auth.uid() = user_id);
-- No update/delete policy for regular users on purpose — only the server,
-- using the service-role key from /api/admin/* routes (protected by
-- ADMIN_SECRET), can mark a submission approved or rejected. A student
-- can never approve their own payment from the browser.

alter publication supabase_realtime add table payment_submissions;

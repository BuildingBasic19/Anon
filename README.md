# HBTU Anon

Anonymous platform for HBTU students: a discussion wall, random anonymous
1-on-1 chat, interest groups, a Movie/Activity Buddy matcher, and a paid
Anon+ tier via manual UPI payment. HBTU email verifies you're a student —
nobody, including you as admin, ever sees another user's real email or
name. Only a random handle like `Anon#4821` is shown.

## Stack
- **Frontend:** Next.js (React) — free hosting on Vercel
- **Backend:** Supabase (Postgres + Auth + Realtime) — free tier
- **Payments:** Manual UPI (works with FamPay, GPay, PhonePe, any UPI app)
  — a student pays your UPI ID directly, submits the transaction
  reference, and you approve it from a simple admin page. No payment
  gateway account needed.

## 1. Set up Supabase
1. Create a free project at https://supabase.com
2. Go to **SQL Editor** and run, in order:
   - `supabase/schema.sql`
   - `supabase/migration_v2_premium_activities.sql`
   - `supabase/migration_v3_manual_upi.sql`
3. In `schema.sql`, the line `if domain <> 'hbtu.ac.in'` restricts sign-ups
   to that email domain — change it if your actual HBTU student email
   domain is different (check a real student email to confirm).
4. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public API key
   - `service_role` secret key (⚠️ never expose this in frontend code —
     it's only used inside `/pages/api/*` server routes)
5. Go to **Authentication → Providers → Email** and make sure "Enable email
   OTP / magic link" is on. Under **Authentication → URL Configuration**,
   add your deployed site URL (and `http://localhost:3000` for local dev)
   to the allowed redirect URLs.

## 2. Set your UPI ID and admin password
No signup needed — just decide:
- Your UPI ID (e.g. `yourid@fam` from the FamPay app, or any UPI ID you
  already have)
- A password only you know, to unlock the admin approval page

## 3. Run locally
```bash
npm install
```
Create a `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_UPI_ID=yourid@fam
NEXT_PUBLIC_UPI_PAYEE_NAME=HBTU Anon
ADMIN_SECRET=choose-a-password-only-you-know
```
```bash
npm run dev
```
Open http://localhost:3000, sign in with an `@hbtu.ac.in` email, check your
inbox for the magic link.

## 4. Deploy for real (free)
1. Push this folder to a GitHub repo
2. Go to https://vercel.com → New Project → import the repo
3. Add all six environment variables above in Vercel's project settings
   (mark `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_SECRET` as secret — never
   prefix them with `NEXT_PUBLIC_`, or they'd be exposed to browsers)
4. Deploy — you'll get a live `.vercel.app` URL you can share with HBTU
   students

## How the payment flow actually works
1. A student clicks "Upgrade to Anon+" (or "Boost") on `/premium` or
   `/activities`
2. They see a UPI QR code (built from your `NEXT_PUBLIC_UPI_ID`) — scanning
   it opens FamPay/GPay/PhonePe/whatever they use, pre-filled with the
   amount
3. After paying, they type in the UPI transaction reference number and
   submit
4. You open `/admin/payments`, enter your `ADMIN_SECRET`, and see it listed
   — check your UPI app's transaction history for that reference, then hit
   **Approve** (or **Reject** if it doesn't check out)
5. Approving instantly flips `is_premium` (or `is_boosted`) for that user
   — they see it update live, no refresh needed

This is manual by design — no KYC, no company registration, works today.
The tradeoff is you have to actually check and approve payments yourself,
which is fine at small scale but won't scale past maybe 20-30 payments/day
before it's worth switching to an automated gateway.

## What's already working
- Email-gated sign-up (only your college domain can join)
- Anonymous handles — real identity never shown anywhere
- Wall: post, categorize, upvote, live-updating feed
- Random anonymous 1-on-1 chat with atomic matchmaking (no double-matching)
- Interest groups: create, join, group chat
- **Movie/Activity Buddy:** post a plan (e.g. "watching the new Marvel
  movie, Sat 6pm"), other students tap "I'm in" and land directly in an
  anonymous chat with you. Free accounts get 2 listings/month.
- **Anon+ (₹49/month, manual UPI):** real interest-based matching in
  Random Chat (free accounts get pure random), unlimited Activity Buddy
  listings, unlimited posts
- **Boost (₹10, one-time):** pin an Activity Buddy listing to the top for
  24 hours — works for anyone, premium or not
- Admin approval page at `/admin/payments`, password-gated by
  `ADMIN_SECRET`

## Sensible next steps
- **Reporting/moderation:** add a `reports` table + a simple admin view,
  since anonymity + college audience means abuse reports will happen —
  do this before any real launch, not after
- **Rate limiting posts:** stop spam (e.g. 1 post per 2 minutes per user)
- **Premium/boost expiry sweep:** a small scheduled job (Supabase cron or
  a Vercel cron route) to flip `is_premium` back to false once
  `premium_until` passes, and un-boost activities after 24h
- **Push notifications** for new chat messages (Supabase + a service worker)
- **Terms/refund policy page:** once you're taking real money, students
  will expect a clear refund/cancellation policy and rules on harassment
- If this outgrows manual approval, Cashfree and Instamojo both support
  individual (non-GST) sign-up and accept UPI automatically — worth
  revisiting once volume gets annoying to review by hand
- Once revenue is more than pocket money, a one-time chat with a CA about
  GST/ITR is worth it — not required at small scale (see earlier discussion)

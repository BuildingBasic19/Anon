import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { admin_secret, submission_id, action } = req.body; // action: 'approve' | 'reject'

  if (admin_secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Wrong admin secret' });
  }
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const { data: submission, error: fetchErr } = await supabaseAdmin
    .from('payment_submissions')
    .select('*')
    .eq('id', submission_id)
    .single();
  if (fetchErr || !submission) return res.status(404).json({ error: 'Submission not found' });

  await supabaseAdmin
    .from('payment_submissions')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', submission_id);

  if (action === 'approve') {
    if (submission.plan === 'anon_plus_monthly') {
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + 30);
      await supabaseAdmin
        .from('profiles')
        .update({ is_premium: true, premium_until: premiumUntil.toISOString() })
        .eq('id', submission.user_id);
    }
    if (submission.plan === 'activity_boost' && submission.activity_id) {
      await supabaseAdmin.from('activities').update({ is_boosted: true }).eq('id', submission.activity_id);
    }
  }

  res.status(200).json({ success: true });
}

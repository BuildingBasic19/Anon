import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { admin_secret } = req.body;
  if (admin_secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Wrong admin secret' });
  }

  const { data, error } = await supabaseAdmin
    .from('payment_submissions')
    .select('*, profiles(anon_handle), activities(title)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ submissions: data });
}

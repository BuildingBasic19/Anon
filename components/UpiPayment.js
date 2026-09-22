import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { buildUpiLink, upiQrImageUrl } from '../lib/upiQr';

const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || 'yourid@fam';
const PAYEE_NAME = process.env.NEXT_PUBLIC_UPI_PAYEE_NAME || 'HBTU Anon';

// plan: 'anon_plus_monthly' | 'activity_boost'
export default function UpiPayment({ plan, amount, label, userId, activityId, onApproved }) {
  const [utr, setUtr] = useState('');
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!submission) return;
    const channel = supabase
      .channel('payment-' + submission.id)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payment_submissions', filter: `id=eq.${submission.id}` },
        (payload) => {
          setSubmission(payload.new);
          if (payload.new.status === 'approved') onApproved?.();
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [submission?.id]);

  const upiLink = buildUpiLink({ vpa: UPI_ID, name: PAYEE_NAME, amount, note: label });

  async function submit(e) {
    e.preventDefault();
    if (!utr.trim() || submitting) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from('payment_submissions')
      .insert({
        user_id: userId,
        plan,
        activity_id: activityId || null,
        amount_rupees: amount,
        utr_reference: utr.trim(),
      })
      .select()
      .single();
    setSubmitting(false);
    if (!error) setSubmission(data);
  }

  if (submission) {
    if (submission.status === 'pending') {
      return (
        <div className="card">
          <p>Payment submitted — waiting for approval.</p>
          <p className="muted">Reference: {submission.utr_reference}</p>
          <p className="muted">This updates automatically once it's checked, usually within a day.</p>
        </div>
      );
    }
    if (submission.status === 'rejected') {
      return (
        <div className="card">
          <p style={{ color: '#ff6b6b' }}>This payment couldn't be verified.</p>
          <p className="muted">Double-check the reference number, or try again.</p>
          <button onClick={() => setSubmission(null)}>Try again</button>
        </div>
      );
    }
  }

  return (
    <div className="card">
      <p>
        <strong>₹{amount}</strong> — {label}
      </p>
      <div style={{ textAlign: 'center', margin: '12px 0' }}>
        <img src={upiQrImageUrl(upiLink)} alt="UPI QR code" style={{ borderRadius: 8 }} />
      </div>
      <p className="muted" style={{ textAlign: 'center' }}>
        Scan with FamPay, GPay, PhonePe, or any UPI app — or pay directly to{' '}
        <strong>{UPI_ID}</strong>
      </p>
      <form onSubmit={submit}>
        <input
          placeholder="UPI transaction reference (UTR) after paying"
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
        />
        <div style={{ height: 8 }} />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : "I've paid — submit for approval"}
        </button>
      </form>
    </div>
  );
}

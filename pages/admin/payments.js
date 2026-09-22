import { useState } from 'react';

export default function AdminPayments() {
  const [secret, setSecret] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  async function unlock(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/list-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_secret: secret }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      alert(data.error);
      return;
    }
    setSubmissions(data.submissions);
    setUnlocked(true);
  }

  async function act(submissionId, action) {
    const res = await fetch('/api/admin/approve-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_secret: secret, submission_id: submissionId, action }),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    setSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, status: action === 'approve' ? 'approved' : 'rejected' } : s))
    );
  }

  if (!unlocked) {
    return (
      <div>
        <h2>Admin — Payments</h2>
        <form onSubmit={unlock} className="card">
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          <div style={{ height: 8 }} />
          <button type="submit" disabled={loading}>{loading ? 'Checking...' : 'Unlock'}</button>
        </form>
      </div>
    );
  }

  const pending = submissions.filter((s) => s.status === 'pending');
  const others = submissions.filter((s) => s.status !== 'pending');

  return (
    <div>
      <h2>Admin — Pending Payments ({pending.length})</h2>
      {pending.map((s) => (
        <div key={s.id} className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="handle">{s.profiles?.anon_handle || 'Anon'}</span>
            <span className="tag">{s.plan}</span>
          </div>
          <p>Amount: ₹{s.amount_rupees}</p>
          <p>UTR/Reference: <strong>{s.utr_reference}</strong></p>
          {s.activities?.title && <p className="muted">For activity: {s.activities.title}</p>}
          <p className="muted">{new Date(s.created_at).toLocaleString()}</p>
          <div className="row">
            <button onClick={() => act(s.id, 'approve')}>Approve</button>
            <button onClick={() => act(s.id, 'reject')} style={{ background: '#2a2e38', color: '#e6e6e6' }}>
              Reject
            </button>
          </div>
        </div>
      ))}
      {pending.length === 0 && <p className="muted">Nothing pending 🎉</p>}

      <h3>Recent history</h3>
      {others.slice(0, 20).map((s) => (
        <div key={s.id} className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="handle">{s.profiles?.anon_handle || 'Anon'}</span>
            <span className="tag">{s.status}</span>
          </div>
          <p className="muted">₹{s.amount_rupees} · {s.plan} · {s.utr_reference}</p>
        </div>
      ))}
    </div>
  );
}

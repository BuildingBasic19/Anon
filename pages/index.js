import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Edit these two lines with your own question/answer:
const VERIFY_QUESTION = 'In which room does the AI-ML class take place?';
const VERIFY_ANSWER = 'CHANGE_ME';

function normalize(str) {
  return str.trim().toLowerCase().replace(/[\s-]+/g, '');
}

const FEATURES = [
  { icon: '🧵', text: 'An anonymous wall to post and vent, freely' },
  { icon: '💬', text: 'Random 1-on-1 anonymous chat with other students' },
  { icon: '👥', text: 'Interest-based groups that feel like real chats' },
  { icon: '🎬', text: 'Find a buddy for movies, outings and study sessions' },
];

export default function Home() {
  const [email, setEmail] = useState('');
  const [roomAnswer, setRoomAnswer] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    if (normalize(roomAnswer) !== normalize(VERIFY_ANSWER)) {
      setError("That doesn't look right — ask a classmate if you're unsure.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/feed' : undefined },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ textAlign: 'center', padding: '20px 8px 28px' }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🎓</div>
        <h1 style={{ marginBottom: 6 }}>HBTU Anon</h1>
        <p className="muted" style={{ fontSize: 14, maxWidth: 340, margin: '0 auto' }}>
          The anonymous space for HBTU students. Post freely, meet new people, join groups —
          nobody ever sees your email.
        </p>
      </div>

      <div className="card stack" style={{ marginBottom: 20 }}>
        {FEATURES.map((f) => (
          <div key={f.text} className="row" style={{ gap: 10 }}>
            <span style={{ fontSize: 18 }}>{f.icon}</span>
            <span style={{ fontSize: 13.5 }}>{f.text}</span>
          </div>
        ))}
      </div>

      {sent ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📩</div>
          <p style={{ margin: 0, fontWeight: 700 }}>Check your inbox</p>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            We sent a login link to <strong style={{ color: 'var(--text)' }}>{email}</strong>
          </p>
        </div>
      ) : (
        <form onSubmit={signIn} className="card stack">
          <div>
            <label className="muted">Your email</label>
            <div style={{ height: 6 }} />
            <input
              type="email"
              placeholder="your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="muted">{VERIFY_QUESTION}</label>
            <div style={{ height: 6 }} />
            <input
              type="text"
              placeholder="Room no."
              value={roomAnswer}
              onChange={(e) => setRoomAnswer(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send login link'}</button>
          {error && <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}
        </form>
      )}
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// The question below is a cheap "are you actually an HBTU student" check,
// used instead of requiring an @hbtu.ac.in email address. Anyone who gets
// the room right can sign in with ANY email (gmail, etc).
//
// Edit these two lines with your own question/answer:
const VERIFY_QUESTION = 'In which room does the AI-ML class take place?';
const VERIFY_ANSWER = 'CHANGE_ME';

// Normalizes an answer for comparison so small formatting differences
// (spaces, dashes, casing) don't fail someone who typed it correctly,
// e.g. "lhc102", "LHC 102", "lhc-102" all match "LHC-102".
function normalize(str) {
  return str.trim().toLowerCase().replace(/[\s-]+/g, '');
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [roomAnswer, setRoomAnswer] = useState('');
  const [sent, setSent] = useState(false);
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

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/feed' : undefined },
    });
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div style={{ paddingTop: 40 }}>
      <h1>HBTU Anon</h1>
      <p className="muted">
        Anonymous space for HBTU students — post freely, meet new people, join interest groups.
        Answering the question below just proves you're a student here — nobody ever sees your email.
      </p>
      {sent ? (
        <p>Check your inbox for a login link 📩</p>
      ) : (
        <form onSubmit={signIn}>
          <input
            type="email"
            placeholder="your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div style={{ height: 10 }} />
          <label className="muted">{VERIFY_QUESTION}</label>
          <div style={{ height: 6 }} />
          <input
            type="text"
            placeholder="Room no."
            value={roomAnswer}
            onChange={(e) => setRoomAnswer(e.target.value)}
          />
          <div style={{ height: 10 }} />
          <button type="submit">Send login link</button>
          {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        </form>
      )}
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const signIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.endsWith('@hbtu.ac.in')) {
      setError('Use your HBTU email address (@hbtu.ac.in)');
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
        Your college email only proves you're a student here — nobody ever sees it.
      </p>
      {sent ? (
        <p>Check your inbox for a login link 📩</p>
      ) : (
        <form onSubmit={signIn}>
          <input
            type="email"
            placeholder="yourid@hbtu.ac.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div style={{ height: 10 }} />
          <button type="submit">Send login link</button>
          {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        </form>
      )}
    </div>
  );
}

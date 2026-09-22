import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import UpiPayment from '../components/UpiPayment';

export default function Premium() {
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return;
    setUserId(data.user.id);
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, premium_until')
      .eq('id', data.user.id)
      .single();
    if (profile) {
      setIsPremium(profile.is_premium);
      setPremiumUntil(profile.premium_until);
    }
  }

  return (
    <div>
      <h2>Anon+</h2>
      {isPremium ? (
        <div className="card">
          <p>You're already on Anon+ ✅</p>
          <p className="muted">Active until {new Date(premiumUntil).toLocaleDateString()}</p>
        </div>
      ) : (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>₹49 / month</h3>
            <ul>
              <li>Find people by interest in Random Chat, not just pure random</li>
              <li>Unlimited posts (free users are rate-limited)</li>
              <li>Create unlimited Movie/Activity Buddy listings</li>
              <li>A colored handle so regulars recognize your posts (still anonymous)</li>
            </ul>
            {!showPayment && <button onClick={() => setShowPayment(true)}>Upgrade to Anon+</button>}
          </div>
          {showPayment && (
            <UpiPayment
              plan="anon_plus_monthly"
              amount={49}
              label="Anon+ Monthly"
              userId={userId}
              onApproved={() => {
                load();
                setShowPayment(false);
              }}
            />
          )}
        </>
      )}
      <p className="muted">
        Pay directly via UPI — approval is manual, usually within a day.
      </p>
    </div>
  );
}

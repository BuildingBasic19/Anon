import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import UpiPayment from '../components/UpiPayment';

const PERKS = [
  'Find people by interest in Random Chat, not just pure random',
  'Unlimited posts (free accounts get 30/month)',
  'Unlimited Movie/Activity Buddy listings',
  'A gold ⭐ handle so regulars recognize your posts (still anonymous)',
];

export default function Premium() {
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      setLoading(false);
      return;
    }
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
    setLoading(false);
  }

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '8px 0 18px' }}>
        <div style={{ fontSize: 34 }}>⭐</div>
        <h2 style={{ margin: '4px 0 0' }}>Anon+</h2>
        <p className="muted">Unlock the full experience</p>
      </div>

      {isPremium ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>You're already on Anon+ ✅</p>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Active until {new Date(premiumUntil).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="spread" style={{ marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>₹49 / month</h3>
              <span className="tag tag-premium">Best value</span>
            </div>
            <div className="stack" style={{ marginTop: 10 }}>
              {PERKS.map((perk) => (
                <div key={perk} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--premium)', fontWeight: 800 }}>✓</span>
                  <span style={{ fontSize: 13.5 }}>{perk}</span>
                </div>
              ))}
            </div>
            {!showPayment && (
              <button style={{ width: '100%', marginTop: 14 }} onClick={() => setShowPayment(true)}>
                Upgrade to Anon+
              </button>
            )}
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
      <p className="muted" style={{ textAlign: 'center', marginTop: 14 }}>
        Pay directly via UPI — approval is manual, usually within a day.
      </p>
    </div>
  );
}

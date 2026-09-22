import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import UpiPayment from '../components/UpiPayment';

const TYPES = ['movie', 'outing', 'study', 'sport', 'other'];

export default function Activities() {
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [myActivityCount, setMyActivityCount] = useState(0);

  const [type, setType] = useState('movie');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState('');
  const [boostingId, setBoostingId] = useState(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUserId(data.user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', data.user.id)
        .single();
      setIsPremium(profile?.is_premium || false);

      const { count } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', data.user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
      setMyActivityCount(count || 0);
    }
    load();
  }

  async function load() {
    const { data } = await supabase
      .from('activities')
      .select('*, profiles(anon_handle)')
      .order('is_boosted', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    setActivities(data || []);
  }

  const FREE_MONTHLY_LIMIT = 2;
  const overFreeLimit = !isPremium && myActivityCount >= FREE_MONTHLY_LIMIT;

  async function createActivity(e) {
    e.preventDefault();
    if (!title.trim() || !userId) return;
    if (overFreeLimit) {
      alert(`Free accounts get ${FREE_MONTHLY_LIMIT} listings/month — upgrade to Anon+ for unlimited.`);
      return;
    }
    await supabase.from('activities').insert({
      author_id: userId,
      activity_type: type,
      title,
      description,
      planned_time: when,
    });
    setTitle('');
    setDescription('');
    setWhen('');
    init();
  }

  // Expressing interest opens a direct anonymous 1-1 chat with the author,
  // reusing the same chat_rooms/messages tables as random chat.
  async function expressInterest(activity) {
    if (!userId) return;
    await supabase.from('activity_interests').insert({ activity_id: activity.id, user_id: userId });

    const { data: room, error } = await supabase
      .from('chat_rooms')
      .insert({ user1_id: userId, user2_id: activity.author_id })
      .select()
      .single();

    if (!error) router.push(`/chat?room=${room.id}`);
  }

  function boost(activityId) {
    setBoostingId(activityId);
  }

  return (
    <div>
      <h2>Movie / Activity Buddy</h2>
      <p className="muted">Post a plan, get matched anonymously with people who want in too.</p>

      <form onSubmit={createActivity} className="card">
        <div className="row">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input placeholder="e.g. Watching the new Marvel movie" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ height: 8 }} />
        <input placeholder="When? (e.g. Sat 6pm, PVR)" value={when} onChange={(e) => setWhen(e.target.value)} />
        <div style={{ height: 8 }} />
        <textarea rows={2} placeholder="Any details..." value={description} onChange={(e) => setDescription(e.target.value)} />
        <div style={{ height: 8 }} />
        <button type="submit" disabled={overFreeLimit}>Post it</button>
        {overFreeLimit && (
          <p className="muted">
            You've used your {FREE_MONTHLY_LIMIT} free listings this month —{' '}
            <a href="/premium" style={{ color: '#6ee7ff' }}>upgrade to Anon+</a> for unlimited.
          </p>
        )}
      </form>

      {activities.map((a) => (
        <div key={a.id} className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="handle">{a.profiles?.anon_handle || 'Anon'}</span>
            <span className="tag">{a.activity_type}{a.is_boosted ? ' 🚀' : ''}</span>
          </div>
          <strong>{a.title}</strong>
          {a.planned_time && <p className="muted">{a.planned_time}</p>}
          {a.description && <p>{a.description}</p>}
          <div className="row">
            {a.author_id !== userId && (
              <button onClick={() => expressInterest(a)}>I'm in — chat</button>
            )}
            {a.author_id === userId && !a.is_boosted && boostingId !== a.id && (
              <button onClick={() => boost(a.id)}>Boost for ₹10 (24h)</button>
            )}
          </div>
          {boostingId === a.id && (
            <UpiPayment
              plan="activity_boost"
              amount={10}
              label={`Boost: ${a.title}`}
              userId={userId}
              activityId={a.id}
              onApproved={() => {
                setBoostingId(null);
                load();
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

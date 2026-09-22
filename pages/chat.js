import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Chat() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [interest, setInterest] = useState('');
  const [searching, setSearching] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUserId(data?.user?.id);
      if (data?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', data.user.id)
          .single();
        setIsPremium(profile?.is_premium || false);
      }
    });
    // Arriving with ?room=<id> (e.g. from Activity Buddy "I'm in — chat")
    // skips the queue entirely and opens that room directly.
    if (router.query.room) {
      setRoomId(router.query.room);
      subscribeToRoom(router.query.room);
    }
    return () => clearInterval(pollRef.current);
  }, [router.query.room]);

  async function findPartner() {
    if (!userId) return;
    setSearching(true);
    await supabase.from('chat_queue').upsert({ user_id: userId, interest: interest || null });

    pollRef.current = setInterval(async () => {
      const { data } = await supabase.rpc('find_match', { requesting_user: userId });
      if (data) {
        clearInterval(pollRef.current);
        setRoomId(data);
        setSearching(false);
        subscribeToRoom(data);
      } else {
        // also check if someone else already matched us into a room
        const { data: room } = await supabase
          .from('chat_rooms')
          .select('id')
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .is('ended_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (room) {
          clearInterval(pollRef.current);
          setRoomId(room.id);
          setSearching(false);
          subscribeToRoom(room.id);
        }
      }
    }, 2000);
  }

  function subscribeToRoom(id) {
    loadMessages(id);
    supabase
      .channel('room-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
  }

  async function loadMessages(id) {
    const { data } = await supabase.from('messages').select('*').eq('room_id', id).order('created_at');
    setMessages(data || []);
  }

  async function send(e) {
    e.preventDefault();
    if (!draft.trim() || !roomId) return;
    await supabase.from('messages').insert({ room_id: roomId, sender_id: userId, content: draft });
    setDraft('');
  }

  async function leaveQueue() {
    clearInterval(pollRef.current);
    setSearching(false);
    if (userId) await supabase.from('chat_queue').delete().eq('user_id', userId);
  }

  if (roomId) {
    return (
      <div>
        <h2>Anonymous Chat</h2>
        <p className="muted">You're talking to a random HBTU student. Neither of you can see who the other is.</p>
        <div className="card" style={{ minHeight: 300 }}>
          {messages.map((m) => (
            <div key={m.id} className={'chat-bubble ' + (m.sender_id === userId ? 'me' : 'them')}>
              {m.content}
            </div>
          ))}
        </div>
        <form onSubmit={send} className="row">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message..." />
          <button type="submit">Send</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2>Random Anonymous Chat</h2>
      <p className="muted">Get paired with another HBTU student, completely anonymously.</p>
      <input
        placeholder="Optional: an interest to match on (e.g. music, coding)"
        value={interest}
        onChange={(e) => setInterest(e.target.value)}
        disabled={searching}
      />
      {!isPremium && interest && (
        <p className="muted">
          Free accounts get pure random matches — <a href="/premium" style={{ color: '#6ee7ff' }}>Anon+</a> actually
          matches you by this interest.
        </p>
      )}
      <div style={{ height: 10 }} />
      {!searching ? (
        <button onClick={findPartner}>Find someone to chat with</button>
      ) : (
        <div>
          <p>Looking for a match...</p>
          <button onClick={leaveQueue}>Cancel</button>
        </div>
      )}
    </div>
  );
}

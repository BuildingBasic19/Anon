import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function Chat() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  // 'list' = conversations list, 'find' = searching for a match, 'room' = inside a chat
  const [view, setView] = useState('list');

  const [conversations, setConversations] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);

  const [interest, setInterest] = useState('');
  const [searching, setSearching] = useState(false);

  const [roomId, setRoomId] = useState(null);
  const [partnerHandle, setPartnerHandle] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');

  const pollRef = useRef(null);
  const windowRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data?.user?.id;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', uid)
          .single();
        setIsPremium(profile?.is_premium || false);
        loadConversations(uid);
      }
    });
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    // Arriving with ?room=<id> (e.g. from Activity Buddy "I'm in — chat")
    // skips straight to that room.
    if (router.query.room) openRoom(router.query.room);
  }, [router.query.room]);

  useEffect(() => {
    windowRef.current?.scrollTo({ top: windowRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function loadConversations(uid) {
    setLoadingConvos(true);
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
      .order('created_at', { ascending: false });

    if (!rooms || rooms.length === 0) {
      setConversations([]);
      setLoadingConvos(false);
      return;
    }

    const partnerIds = [...new Set(rooms.map((r) => (r.user1_id === uid ? r.user2_id : r.user1_id)))];
    const roomIds = rooms.map((r) => r.id);

    const [{ data: profiles }, { data: lastMessages }] = await Promise.all([
      supabase.from('profiles').select('id, anon_handle, is_premium').in('id', partnerIds),
      supabase
        .from('messages')
        .select('room_id, content, created_at')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false }),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    const previewMap = {};
    (lastMessages || []).forEach((m) => {
      if (!previewMap[m.room_id]) previewMap[m.room_id] = m;
    });

    const enriched = rooms.map((r) => {
      const partnerId = r.user1_id === uid ? r.user2_id : r.user1_id;
      return { ...r, partner: profileMap[partnerId], lastMessage: previewMap[r.id] };
    });

    setConversations(enriched);
    setLoadingConvos(false);
  }

  async function findPartner() {
    if (!userId) return;
    setView('find');
    setSearching(true);
    await supabase.from('chat_queue').upsert({ user_id: userId, interest: interest || null });

    pollRef.current = setInterval(async () => {
      const { data } = await supabase.rpc('find_match', { requesting_user: userId });
      if (data) {
        clearInterval(pollRef.current);
        setSearching(false);
        openRoom(data);
      } else {
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
          setSearching(false);
          openRoom(room.id);
        }
      }
    }, 2000);
  }

  async function openRoom(id) {
    setRoomId(id);
    setView('room');
    setPartnerHandle(null);

    const { data: room } = await supabase.from('chat_rooms').select('*').eq('id', id).single();
    if (room && userId) {
      const partnerId = room.user1_id === userId ? room.user2_id : room.user1_id;
      const { data: partner } = await supabase.from('profiles').select('anon_handle').eq('id', partnerId).single();
      setPartnerHandle(partner?.anon_handle || 'Anon');
    }

    loadMessages(id);
    subscribeToRoom(id);
  }

  function subscribeToRoom(id) {
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
    setView('list');
    if (userId) await supabase.from('chat_queue').delete().eq('user_id', userId);
  }

  function backToList() {
    setRoomId(null);
    setMessages([]);
    setView('list');
    if (userId) loadConversations(userId);
  }

  // ---------- ROOM VIEW ----------
  if (view === 'room') {
    return (
      <div>
        <div className="chat-header">
          <button className="ghost" onClick={backToList}>← Back</button>
          {partnerHandle && <Avatar handle={partnerHandle} size={32} />}
          <div>
            <strong>{partnerHandle || 'Anon'}</strong>
            <p className="muted" style={{ margin: 0 }}>Anonymous — neither of you can see who the other is</p>
          </div>
        </div>

        <div className="chat-window" ref={windowRef}>
          {messages.length === 0 && (
            <EmptyState icon="👋" title="Say hi!" subtitle="Nobody's sent a message here yet." />
          )}
          {messages.map((m) => (
            <div key={m.id} className={'message-row ' + (m.sender_id === userId ? 'me' : 'them')}>
              <div className={'chat-bubble ' + (m.sender_id === userId ? 'me' : 'them')}>{m.content}</div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="chat-input-bar">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message..." />
          <button type="submit">➤</button>
        </form>
      </div>
    );
  }

  // ---------- FIND VIEW ----------
  if (view === 'find') {
    return (
      <div>
        <button className="ghost" onClick={leaveQueue} style={{ marginBottom: 10 }}>← Back</button>
        <h2>Random Anonymous Chat</h2>
        <p className="muted">Get paired with another HBTU student, completely anonymously.</p>
        <div className="spinner" />
        <p style={{ textAlign: 'center' }}>Looking for a match...</p>
        <div style={{ textAlign: 'center' }}>
          <button className="secondary" onClick={leaveQueue}>Cancel</button>
        </div>
      </div>
    );
  }

  // ---------- LIST VIEW ----------
  return (
    <div>
      <div className="spread" style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Random Chat</h2>
      </div>

      <div className="card stack">
        <input
          placeholder="Optional: an interest to match on (e.g. music, coding)"
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
        />
        {!isPremium && interest && (
          <p className="muted" style={{ margin: 0 }}>
            Free accounts get pure random matches — <a href="/premium" style={{ color: 'var(--accent)' }}>Anon+</a> actually
            matches you by this interest.
          </p>
        )}
        <button onClick={findPartner}>🔀 Find someone new to chat with</button>
      </div>

      <hr className="divider" />
      <p className="muted" style={{ margin: '0 0 8px', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>
        Your conversations
      </p>

      {loadingConvos && <div className="spinner" />}

      {!loadingConvos && conversations.length === 0 && (
        <EmptyState
          icon="💬"
          title="No conversations yet"
          subtitle="Find someone new above — every chat you have will show up here so you can pick up where you left off."
        />
      )}

      {!loadingConvos && conversations.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          {conversations.map((c) => (
            <div key={c.id} className="conversation-item" onClick={() => openRoom(c.id)}>
              <Avatar handle={c.partner?.anon_handle} size={40} premium={c.partner?.is_premium} />
              <div className="conversation-body">
                <div className="spread">
                  <span className="handle" style={{ fontSize: 14 }}>{c.partner?.anon_handle || 'Anon'}</span>
                  <span className="conversation-time">{timeAgo(c.lastMessage?.created_at || c.created_at)}</span>
                </div>
                <div className="conversation-preview">
                  {c.lastMessage?.content || 'No messages yet — say hi!'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

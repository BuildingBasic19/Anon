import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import { colorsFor } from '../../lib/avatar';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GroupRoom() {
  const router = useRouter();
  const { id } = router.query;
  const [userId, setUserId] = useState(null);
  const [group, setGroup] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const windowRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id));
    loadGroup();
    load();
    const channel = supabase
      .channel('group-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id]);

  useEffect(() => {
    windowRef.current?.scrollTo({ top: windowRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function loadGroup() {
    const { data } = await supabase.from('groups').select('*').eq('id', id).single();
    setGroup(data);
    const { count } = await supabase.from('group_members').select('user_id', { count: 'exact', head: true }).eq('group_id', id);
    setMemberCount(count || 0);
  }

  async function load() {
    const { data } = await supabase
      .from('group_messages')
      .select('*, profiles(anon_handle, is_premium)')
      .eq('group_id', id)
      .order('created_at');
    setMessages(data || []);
    setLoading(false);
  }

  async function send(e) {
    e.preventDefault();
    if (!draft.trim() || !userId) return;
    await supabase.from('group_messages').insert({ group_id: id, sender_id: userId, content: draft });
    setDraft('');
  }

  const [c1, c2] = colorsFor(group?.name || '');

  return (
    <div>
      <div className="chat-header">
        <a href="/groups" className="ghost" style={{ textDecoration: 'none', padding: '6px 10px' }}>← Back</a>
        <div className="group-icon" style={{ width: 32, height: 32, fontSize: 14, background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
          {group?.name?.slice(0, 1)?.toUpperCase() || '?'}
        </div>
        <div>
          <strong>{group?.name || 'Group Chat'}</strong>
          <p className="muted" style={{ margin: 0 }}>{memberCount} member{memberCount === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="chat-window" ref={windowRef}>
        {loading && <div className="spinner" />}
        {!loading && messages.length === 0 && (
          <EmptyState icon="✨" title="No messages yet" subtitle="Be the first to say something in this group." />
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === userId;
          const prev = messages[i - 1];
          const showSender = !mine && (!prev || prev.sender_id !== m.sender_id);
          const handle = m.profiles?.anon_handle || 'Anon';
          const premium = !!m.profiles?.is_premium;
          return (
            <div key={m.id} className={'message-row ' + (mine ? 'me' : 'them')}>
              {!mine && <Avatar handle={handle} size={26} premium={premium} />}
              <div className="message-group">
                {showSender && (
                  <span className={premium ? 'message-sender handle-premium' : 'message-sender'}>
                    {premium && '⭐ '}{handle}
                  </span>
                )}
                <div className={'chat-bubble ' + (mine ? 'me' : 'them')}>{m.content}</div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="chat-input-bar">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message the group..." />
        <button type="submit">➤</button>
      </form>
    </div>
  );
}

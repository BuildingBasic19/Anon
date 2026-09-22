import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function GroupRoom() {
  const router = useRouter();
  const { id } = router.query;
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id));
    load();
    const channel = supabase
      .channel('group-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id]);

  async function load() {
    const { data } = await supabase
      .from('group_messages')
      .select('*, profiles(anon_handle)')
      .eq('group_id', id)
      .order('created_at');
    setMessages(data || []);
  }

  async function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    await supabase.from('group_messages').insert({ group_id: id, sender_id: userId, content: draft });
    setDraft('');
  }

  return (
    <div>
      <h2>Group Chat</h2>
      <div className="card" style={{ minHeight: 300 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 6 }}>
            <span className="handle">{m.profiles?.anon_handle || 'Anon'}: </span>
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="row">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message the group..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

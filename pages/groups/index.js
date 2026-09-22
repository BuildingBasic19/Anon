import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id));
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
    setGroups(data || []);
  }

  async function createGroup(e) {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    const { data, error } = await supabase
      .from('groups')
      .insert({ name, description: desc, created_by: userId })
      .select()
      .single();
    if (!error) {
      await supabase.from('group_members').insert({ group_id: data.id, user_id: userId });
      setName('');
      setDesc('');
      load();
    }
  }

  async function join(groupId) {
    await supabase.from('group_members').upsert({ group_id: groupId, user_id: userId });
  }

  return (
    <div>
      <h2>Interest Groups</h2>
      <form onSubmit={createGroup} className="card">
        <input placeholder="Group name (e.g. GATE Prep)" value={name} onChange={(e) => setName(e.target.value)} />
        <div style={{ height: 8 }} />
        <input placeholder="Short description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <div style={{ height: 8 }} />
        <button type="submit">Create group</button>
      </form>

      {groups.map((g) => (
        <div key={g.id} className="card row" style={{ justifyContent: 'space-between' }}>
          <div>
            <strong>{g.name}</strong>
            <p className="muted">{g.description}</p>
          </div>
          <div className="row">
            <button onClick={() => join(g.id)}>Join</button>
            <Link href={`/groups/${g.id}`}>Open</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

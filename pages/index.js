import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { colorsFor } from '../../lib/avatar';
import EmptyState from '../../components/EmptyState';

export default function Groups() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [myGroupIds, setMyGroupIds] = useState(new Set());
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id);
      if (data?.user?.id) loadMemberships(data.user.id);
    });
    load();
  }, []);

  async function loadMemberships(uid) {
    const { data } = await supabase.from('group_members').select('group_id').eq('user_id', uid);
    setMyGroupIds(new Set((data || []).map((r) => r.group_id)));
  }

  async function load() {
    const { data } = await supabase
      .from('groups')
      .select('*, group_members(count)')
      .order('created_at', { ascending: false });
    setGroups(data || []);
    setLoading(false);
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
      setShowForm(false);
      load();
      loadMemberships(userId);
    }
  }

  async function joinAndOpen(groupId) {
    if (!userId) return;
    setJoiningId(groupId);
    await supabase.from('group_members').upsert({ group_id: groupId, user_id: userId });
    setJoiningId(null);
    router.push(`/groups/${groupId}`);
  }

  return (
    <div>
      <div className="spread" style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Groups</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New group'}</button>
      </div>

      {showForm && (
        <form onSubmit={createGroup} className="card stack">
          <input placeholder="Group name (e.g. GATE Prep)" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Short description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <button type="submit">Create group</button>
        </form>
      )}

      {loading && <div className="spinner" />}

      {!loading && groups.length === 0 && (
        <EmptyState
          icon="👥"
          title="No groups yet"
          subtitle="Start one around any interest — GATE prep, hostel life, a hobby, anything."
        />
      )}

      {!loading && groups.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          {groups.map((g) => {
            const [c1, c2] = colorsFor(g.name);
            const memberCount = g.group_members?.[0]?.count ?? 0;
            const joined = myGroupIds.has(g.id);
            return (
              <div key={g.id} className="conversation-item" onClick={() => (joined ? router.push(`/groups/${g.id}`) : joinAndOpen(g.id))}>
                <div className="group-icon" style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                  {g.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="conversation-body">
                  <div className="spread">
                    <strong style={{ fontSize: 14.5 }}>{g.name}</strong>
                    <span className="muted">{memberCount} member{memberCount === 1 ? '' : 's'}</span>
                  </div>
                  <div className="conversation-preview">{g.description || 'No description'}</div>
                </div>
                {!joined && (
                  <button className="secondary" disabled={joiningId === g.id} onClick={(e) => { e.stopPropagation(); joinAndOpen(g.id); }}>
                    {joiningId === g.id ? '…' : 'Join'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

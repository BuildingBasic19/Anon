import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import PostCard from '../components/PostCard';

const CATEGORIES = ['general', 'academics', 'hostel', 'events', 'confessions'];

const FREE_MONTHLY_POST_LIMIT = 30;

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [myPostCount, setMyPostCount] = useState(0);

  useEffect(() => {
    init();

    const channel = supabase
      .channel('posts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => loadPosts())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function init() {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) {
      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', data.user.id)
        .single();
      setIsPremium(profile?.is_premium || false);

      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', data.user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
      setMyPostCount(count || 0);
    }
    loadPosts();
  }

  async function loadPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(anon_handle, is_premium)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setPosts(data);
  }

  const overFreeLimit = !isPremium && myPostCount >= FREE_MONTHLY_POST_LIMIT;

  async function submitPost(e) {
    e.preventDefault();
    if (!content.trim() || !userId) return;
    if (overFreeLimit) {
      alert(`Free accounts get ${FREE_MONTHLY_POST_LIMIT} posts/month — upgrade to Anon+ for unlimited.`);
      return;
    }
    await supabase.from('posts').insert({ author_id: userId, content, category });
    setContent('');
    setMyPostCount((c) => c + 1);
    loadPosts();
  }

  async function upvote(postId) {
    if (!userId) return;
    const { error } = await supabase.from('post_votes').insert({ post_id: postId, user_id: userId });
    if (!error) {
      await supabase.rpc('increment_upvote', { p_post_id: postId }).catch(() => {});
      // fallback: simple client-side increment if RPC not created
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p)));
    }
  }

  return (
    <div>
      <h2>Anonymous Wall</h2>
      <form onSubmit={submitPost} className="card">
        <textarea
          rows={3}
          placeholder="Share something... nobody will know it's you"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="row" style={{ marginTop: 8, justifyContent: 'space-between' }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button type="submit" disabled={overFreeLimit}>Post anonymously</button>
        </div>
        {overFreeLimit && (
          <p className="muted">
            You've used your {FREE_MONTHLY_POST_LIMIT} free posts this month —{' '}
            <a href="/premium" style={{ color: '#6ee7ff' }}>upgrade to Anon+</a> for unlimited.
          </p>
        )}
      </form>

      {posts.map((p) => (
        <PostCard key={p.id} post={p} onUpvote={upvote} />
      ))}
    </div>
  );
}

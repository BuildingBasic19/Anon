import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import PostCard from '../components/PostCard';

const CATEGORIES = ['general', 'academics', 'hostel', 'events', 'confessions'];

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id));
    loadPosts();

    const channel = supabase
      .channel('posts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => loadPosts())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function loadPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(anon_handle)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setPosts(data);
  }

  async function submitPost(e) {
    e.preventDefault();
    if (!content.trim() || !userId) return;
    await supabase.from('posts').insert({ author_id: userId, content, category });
    setContent('');
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
          <button type="submit">Post anonymously</button>
        </div>
      </form>

      {posts.map((p) => (
        <PostCard key={p.id} post={p} onUpvote={upvote} />
      ))}
    </div>
  );
}

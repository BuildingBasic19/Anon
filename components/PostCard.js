export default function PostCard({ post, onUpvote }) {
  const isPremium = !!post.profiles?.is_premium;
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className={isPremium ? 'handle handle-premium' : 'handle'}>
          {isPremium && '⭐ '}
          {post.profiles?.anon_handle || 'Anon'}
        </span>
        <span className="tag">{post.category}</span>
      </div>
      <p style={{ marginBottom: 8 }}>{post.content}</p>
      <div className="row">
        <button onClick={() => onUpvote(post.id)}>▲ {post.upvotes}</button>
        <span className="muted">{new Date(post.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
}

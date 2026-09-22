export default function PostCard({ post, onUpvote }) {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="handle">{post.profiles?.anon_handle || 'Anon'}</span>
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

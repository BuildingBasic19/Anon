import Avatar from './Avatar';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PostCard({ post, onUpvote }) {
  const isPremium = !!post.profiles?.is_premium;
  const handle = post.profiles?.anon_handle || 'Anon';
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="row">
          <Avatar handle={handle} size={30} premium={isPremium} />
          <span className={isPremium ? 'handle handle-premium' : 'handle'}>
            {isPremium && '⭐ '}
            {handle}
          </span>
        </div>
        <span className="tag">{post.category}</span>
      </div>
      <p style={{ marginBottom: 10, marginTop: 0, whiteSpace: 'pre-wrap' }}>{post.content}</p>
      <div className="row spread">
        <button className="secondary" onClick={() => onUpvote(post.id)}>▲ {post.upvotes}</button>
        <span className="muted">{timeAgo(post.created_at)}</span>
      </div>
    </div>
  );
}

import { officialLinks } from '../lib/officialLinks';
import EmptyState from '../components/EmptyState';

export default function Links() {
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Official College Links</h2>
      <p className="muted" style={{ marginBottom: 14 }}>Verified official groups — not anonymous, run by the college/branch reps.</p>

      {officialLinks.length === 0 && (
        <EmptyState icon="🔗" title="No links added yet" subtitle="Check back soon." />
      )}

      {officialLinks.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          {officialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="conversation-item"
            >
              <div className="group-icon" style={{ width: 40, height: 40, background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 18 }}>
                {link.icon}
              </div>
              <div className="conversation-body">
                <strong style={{ fontSize: 14 }}>{link.name}</strong>
                <div className="conversation-preview">{link.description}</div>
              </div>
              <span className="muted">↗</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

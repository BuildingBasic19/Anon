import { officialLinks } from '../lib/officialLinks';

export default function Links() {
  return (
    <div>
      <h2>Official College Links</h2>
      <p className="muted">Verified official groups — not anonymous, run by the college/branch reps.</p>

      {officialLinks.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <div className="card row" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong>{link.icon} {link.name}</strong>
              <p className="muted" style={{ marginBottom: 0 }}>{link.description}</p>
            </div>
            <span className="muted">↗</span>
          </div>
        </a>
      ))}

      {officialLinks.length === 0 && <p className="muted">No links added yet.</p>}
    </div>
  );
}

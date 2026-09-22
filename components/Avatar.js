import { colorsFor, initialsFor } from '../lib/avatar';

export default function Avatar({ handle, size = 36, premium = false }) {
  const [c1, c2] = colorsFor(handle);
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.36),
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        boxShadow: premium ? '0 0 0 2px #f4c542' : 'none',
      }}
    >
      {initialsFor(handle)}
    </div>
  );
}

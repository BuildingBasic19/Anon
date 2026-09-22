// Deterministic "avatar" (color + initials) derived from a string, so the
// same anon_handle always renders the same little colored circle without
// storing any actual profile picture.

const PALETTE = [
  ['#6ee7ff', '#3b82f6'],
  ['#a78bfa', '#7c3aed'],
  ['#f4c542', '#f59e0b'],
  ['#34d399', '#059669'],
  ['#f472b6', '#db2777'],
  ['#fb923c', '#ea580c'],
  ['#60a5fa', '#6366f1'],
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function colorsFor(str) {
  const key = str || 'Anon';
  return PALETTE[hashString(key) % PALETTE.length];
}

export function initialsFor(str) {
  if (!str) return '?';
  const digits = str.match(/\d+/);
  if (digits) return digits[0].slice(-2).padStart(2, '0');
  return str.slice(0, 2).toUpperCase();
}

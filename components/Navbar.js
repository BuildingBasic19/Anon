import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV_ITEMS = [
  { href: '/feed', label: 'Wall', icon: '🧵' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/groups', label: 'Groups', icon: '👥' },
  { href: '/activities', label: 'Buddy', icon: '🎬' },
  { href: '/links', label: 'Links', icon: '🔗' },
  { href: '/premium', label: 'Anon+', icon: '⭐' },
];

export default function Navbar() {
  const router = useRouter();
  const is = (p) => (router.pathname === p || router.pathname.startsWith(p + '/') ? 'active' : '');
  return (
    <div className="navbar">
      {NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={is(item.href)}>
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}

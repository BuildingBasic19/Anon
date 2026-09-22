import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navbar() {
  const router = useRouter();
  const is = (p) => (router.pathname === p ? 'active' : '');
  return (
    <div className="navbar">
      <Link href="/feed" className={is('/feed')}>Wall</Link>
      <Link href="/chat" className={is('/chat')}>Random Chat</Link>
      <Link href="/groups" className={is('/groups')}>Groups</Link>
      <Link href="/activities" className={is('/activities')}>Activity Buddy</Link>
      <Link href="/premium" className={is('/premium')}>Anon+</Link>
    </div>
  );
}

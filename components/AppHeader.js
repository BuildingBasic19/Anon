import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Avatar from './Avatar';

export default function AppHeader() {
  const [handle, setHandle] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user?.id) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('anon_handle, is_premium')
        .eq('id', data.user.id)
        .single();
      if (profile) {
        setHandle(profile.anon_handle);
        setIsPremium(profile.is_premium);
      }
    });
  }, []);

  return (
    <div className="app-header">
      <span className="app-logo">🎓 HBTU <span className="accent">Anon</span></span>
      {handle && (
        <div className="app-user">
          <Avatar handle={handle} size={24} premium={isPremium} />
          <span>{handle}</span>
        </div>
      )}
    </div>
  );
}

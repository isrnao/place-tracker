import { Auth } from '@supabase/auth-ui-react';

import { supabase } from '~/api/supabaseClient';

export const meta = () => [{ title: 'Login - Place Tracker' }];

export default function Login() {
  return (
    <main className='flex h-screen items-center justify-center'>
      <Auth supabaseClient={supabase} />
    </main>
  );
}

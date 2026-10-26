import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/sign-in`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function accountName(session: Session | null) {
  const meta = session?.user.user_metadata ?? {};
  const name = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : '';
  return name.trim();
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/hooks/useDeviceId';

const CACHE_KEY = 'hw-avatar-cache';

let avatarCache: Record<string, string> = {};
try {
  const saved = localStorage.getItem(CACHE_KEY);
  if (saved) avatarCache = JSON.parse(saved);
} catch {}

export function useAvatars() {
  const [avatars, setAvatars] = useState<Record<string, string>>(avatarCache);

  const loadAvatars = useCallback(async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('author_name, avatar_url')
      .not('avatar_url', 'is', null);
    if (data) {
      const map: Record<string, string> = {};
      (data as any[]).forEach(p => {
        if (p.avatar_url) map[p.author_name] = p.avatar_url;
      });
      avatarCache = map;
      setAvatars(map);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch {}
    }
  }, []);

  useEffect(() => { loadAvatars(); }, [loadAvatars]);

  return { avatars, refresh: loadAvatars };
}

export async function uploadAvatar(file: File, authorName: string): Promise<string | null> {
  const deviceId = getDeviceId();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${deviceId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('profile-pictures')
    .upload(path, file, { upsert: true });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(path);

  const avatarUrl = urlData.publicUrl;

  // Upsert profile
  const { error: upsertError } = await supabase
    .from('user_profiles')
    .upsert(
      { device_id: deviceId, author_name: authorName, avatar_url: avatarUrl } as any,
      { onConflict: 'device_id' }
    );

  if (upsertError) {
    console.error('Profile upsert error:', upsertError);
  }

  return avatarUrl;
}

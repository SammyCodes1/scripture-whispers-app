import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/hooks/useDeviceId';

export interface Notification {
  id: string;
  device_id: string;
  post_id: string;
  type: string;
  actor_name: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const deviceId = getDeviceId();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount((data as Notification[]).filter(n => !n.read).length);
    }
  }, [deviceId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('my-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `device_id=eq.${deviceId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deviceId, load]);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [notifications]);

  return { notifications, unreadCount, markAllRead, refresh: load };
}

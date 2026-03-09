import { useState, useRef, useEffect } from 'react';
import { Bell, Heart, MessageCircle, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  subject: string;
  message: string;
  created_at: string;
}

const SEEN_KEY = 'hw-seen-announcement-ids';

function getSeenIds(): Set<string> {
  try {
    const saved = localStorage.getItem(SEEN_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch { return new Set(); }
}

function saveSeenIds(ids: Set<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'notifications' | 'announcements'>('notifications');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(getSeenIds);
  const ref = useRef<HTMLDivElement>(null);

  const unreadAnnouncementCount = announcements.filter(a => !seenIds.has(a.id)).length;
  const totalUnread = unreadCount + unreadAnnouncementCount;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setAnnouncements(data as Announcement[]);
    };
    load();

    const channel = supabase
      .channel('notif-announcements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        setAnnouncements(prev => [payload.new as Announcement, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleOpen = () => {
    const wasOpen = open;
    setOpen(prev => !prev);
    if (!wasOpen && unreadCount > 0) markAllRead();
  };

  const handleTabSwitch = (t: 'notifications' | 'announcements') => {
    setTab(t);
    if (t === 'announcements' && unreadAnnouncementCount > 0) {
      const updated = new Set(seenIds);
      announcements.forEach(a => updated.add(a.id));
      setSeenIds(updated);
      saveSeenIds(updated);
    }
    if (t === 'notifications' && unreadCount > 0) {
      markAllRead();
    }
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors relative"
      >
        <Bell size={20} />
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 sm:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm max-h-[70vh] rounded-xl bg-card border border-border shadow-xl z-50 flex flex-col sm:absolute sm:left-auto sm:top-full sm:translate-x-0 sm:translate-y-0 sm:right-0 sm:mt-2 sm:w-80 sm:max-h-[28rem]"
          >
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => handleTabSwitch('notifications')}
                className={`flex-1 px-3 py-2.5 text-xs font-bold tracking-wide transition-colors relative ${
                  tab === 'notifications'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Notifications
                {unreadCount > 0 && tab !== 'notifications' && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleTabSwitch('announcements')}
                className={`flex-1 px-3 py-2.5 text-xs font-bold tracking-wide transition-colors relative ${
                  tab === 'announcements'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Announcements
                {unreadAnnouncementCount > 0 && tab !== 'announcements' && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    {unreadAnnouncementCount > 9 ? '9+' : unreadAnnouncementCount}
                  </span>
                )}
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {tab === 'notifications' ? (
                notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map(n => (
                      <Link
                        key={n.id}
                        to="/community"
                        onClick={() => setOpen(false)}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${
                          !n.read ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-full ${
                          n.type === 'like' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                        }`}>
                          {n.type === 'like' ? <Heart size={14} /> : <MessageCircle size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-card-foreground leading-snug">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                        )}
                      </Link>
                    ))}
                  </div>
                )
              ) : (
                announcements.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">No announcements yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {announcements.map(a => (
                      <div key={a.id} className={`px-4 py-3 hover:bg-secondary/50 transition-colors ${!seenIds.has(a.id) ? 'bg-primary/5' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
                            <Megaphone size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-card-foreground leading-snug">{a.subject}</p>
                            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{a.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!seenIds.has(a.id) && (
                            <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

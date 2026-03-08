import { useState, useRef, useEffect } from 'react';
import { Bell, Heart, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(prev => !prev);
    if (!open && unreadCount > 0) markAllRead();
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
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-card border border-border shadow-xl z-50"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="font-display font-bold text-sm text-card-foreground">Notifications</p>
            </div>

            {notifications.length === 0 ? (
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

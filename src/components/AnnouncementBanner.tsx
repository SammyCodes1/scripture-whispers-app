import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  subject: string;
  message: string;
  created_at: string;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('hw-dismissed-announcements');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    // Load recent announcements (last 7 days)
    const load = async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setAnnouncements(data as Announcement[]);
    };
    load();

    // Realtime subscription for new announcements
    const channel = supabase
      .channel('announcements-broadcast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          setAnnouncements(prev => [payload.new as Announcement, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const dismiss = (id: string) => {
    const updated = new Set(dismissed);
    updated.add(id);
    setDismissed(updated);
    localStorage.setItem('hw-dismissed-announcements', JSON.stringify([...updated]));
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {visible.map(a => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-primary/10 border border-primary/30 p-4 relative"
          >
            <button
              onClick={() => dismiss(a.id)}
              className="absolute top-2 right-2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X size={14} />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
                <Megaphone size={16} />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-foreground">{a.subject}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

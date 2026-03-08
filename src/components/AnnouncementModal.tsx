import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ACK_KEY = 'hw-acked-announcements';

function getAckedIds(): Set<string> {
  try {
    const saved = localStorage.getItem(ACK_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch { return new Set(); }
}

function saveAckedIds(ids: Set<string>) {
  localStorage.setItem(ACK_KEY, JSON.stringify([...ids]));
}

interface Announcement {
  id: string;
  subject: string;
  message: string;
  created_at: string;
}

export default function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [ackedIds, setAckedIds] = useState<Set<string>>(getAckedIds);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const latest = data[0] as Announcement;
        if (!ackedIds.has(latest.id)) {
          setAnnouncement(latest);
        }
      }
    };
    load();

    // Listen for new announcements in real-time
    const channel = supabase
      .channel('announcement-modal')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        const newAnn = payload.new as Announcement;
        if (!ackedIds.has(newAnn.id)) {
          setAnnouncement(newAnn);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAcknowledge = () => {
    if (!announcement) return;
    const updated = new Set(ackedIds);
    updated.add(announcement.id);
    setAckedIds(updated);
    saveAckedIds(updated);
    setAnnouncement(null);
  };

  const handleDismiss = () => {
    if (!announcement) return;
    const updated = new Set(ackedIds);
    updated.add(announcement.id);
    setAckedIds(updated);
    saveAckedIds(updated);
    setAnnouncement(null);
  };

  return (
    <AnimatePresence>
      {announcement && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-2xl bg-card border border-border shadow-2xl z-[101] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary/10 px-6 py-5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                <Megaphone size={22} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">New Announcement</p>
                <h2 className="font-display font-bold text-lg text-card-foreground">{announcement.subject}</h2>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-muted-foreground leading-relaxed">{announcement.message}</p>
              <p className="text-[10px] text-muted-foreground mt-3">
                {new Date(announcement.created_at).toLocaleDateString(undefined, {
                  month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleAcknowledge}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
              >
                <Check size={16} />
                Acknowledge
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition"
              >
                <X size={16} />
                Dismiss
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

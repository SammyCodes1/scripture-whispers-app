import { useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'sammy.cryptguy@gmail.com';

export default function AdminAnnouncementPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleUnlock = () => {
    if (email.trim().toLowerCase() === ADMIN_EMAIL) {
      setUnlocked(true);
    } else {
      toast.error('Unauthorized email');
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        subject: subject.trim(),
        message: message.trim(),
        sender_email: ADMIN_EMAIL,
      });
      if (error) throw error;
      toast.success('Announcement sent to all users!');
      setSubject('');
      setMessage('');
    } catch {
      toast.error('Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  return (
    <section>
      <h3 className="font-display text-base font-bold text-foreground mb-3 flex items-center gap-2">
        <Megaphone size={18} className="text-primary" /> Broadcast Announcement
      </h3>

      {!unlocked ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Enter admin email to unlock.</p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Admin email"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          />
          <button
            onClick={handleUnlock}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            Unlock
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            maxLength={200}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Message to all users..."
            maxLength={1000}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send Announcement'}
          </button>
        </div>
      )}
    </section>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, UserCheck, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/hooks/useDeviceId';
import { toast } from 'sonner';

interface AuthorProfileProps {
  authorName: string;
  open: boolean;
  onClose: () => void;
}

export default function AuthorProfile({ authorName, open, onClose }: AuthorProfileProps) {
  const [postCount, setPostCount] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const load = async () => {
      const [postsRes, subCheckRes, subCountRes] = await Promise.all([
        supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('author_name', authorName),
        supabase.from('subscriptions').select('id').eq('subscriber_device_id', deviceId).eq('author_name', authorName).limit(1),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('author_name', authorName),
      ]);

      setPostCount(postsRes.count ?? 0);
      setSubscribed((subCheckRes.data?.length ?? 0) > 0);
      setSubscriberCount(subCountRes.count ?? 0);
      setLoading(false);
    };
    load();
  }, [open, authorName, deviceId]);

  const toggleSubscribe = async () => {
    if (subscribed) {
      await supabase.from('subscriptions').delete().eq('subscriber_device_id', deviceId).eq('author_name', authorName);
      setSubscribed(false);
      setSubscriberCount(prev => Math.max(0, prev - 1));
      toast.success(`Unsubscribed from ${authorName}`);
    } else {
      const { error } = await supabase.from('subscriptions').insert({
        subscriber_device_id: deviceId,
        author_name: authorName,
      } as any);
      if (error) {
        toast.error('Failed to subscribe');
        return;
      }
      setSubscribed(true);
      setSubscriberCount(prev => prev + 1);
      toast.success(`Subscribed to ${authorName}!`);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-xs rounded-2xl bg-card border border-border shadow-2xl z-50 overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X size={16} />
            </button>

            <div className="pt-8 pb-6 px-6 flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold mb-3">
                {authorName[0]?.toUpperCase()}
              </div>

              <h3 className="font-display font-bold text-lg text-card-foreground">{authorName}</h3>

              {loading ? (
                <p className="text-xs text-muted-foreground mt-2">Loading...</p>
              ) : (
                <>
                  <div className="flex gap-6 mt-3">
                    <div className="text-center">
                      <p className="font-bold text-card-foreground text-lg">{postCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Posts</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-card-foreground text-lg">{subscriberCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Subscribers</p>
                    </div>
                  </div>

                  <button
                    onClick={toggleSubscribe}
                    className={`mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      subscribed
                        ? 'bg-secondary text-secondary-foreground hover:bg-destructive/10 hover:text-destructive'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    }`}
                  >
                    {subscribed ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    {subscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

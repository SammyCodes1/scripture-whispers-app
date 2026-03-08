import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, UserCheck, Heart, MessageCircle, FileText, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/hooks/useDeviceId';
import { toast } from 'sonner';

interface Post {
  id: string;
  title: string;
  content: string;
  likes: number;
  image_url: string | null;
  created_at: string;
}

interface AuthorProfileProps {
  authorName: string;
  open: boolean;
  onClose: () => void;
  isSelf?: boolean;
}

export default function AuthorProfile({ authorName, open, onClose, isSelf }: AuthorProfileProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  useEffect(() => {
    if (!open || !authorName) return;
    setLoading(true);

    const load = async () => {
      const [postsRes, subCheckRes, subCountRes] = await Promise.all([
        supabase.from('community_posts').select('id, title, content, likes, image_url, created_at').eq('author_name', authorName).order('created_at', { ascending: false }).limit(50),
        supabase.from('subscriptions').select('id').eq('subscriber_device_id', deviceId).eq('author_name', authorName).limit(1),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('author_name', authorName),
      ]);

      setPosts((postsRes.data as Post[]) ?? []);
      setSubscribed((subCheckRes.data?.length ?? 0) > 0);
      setSubscriberCount(subCountRes.count ?? 0);
      setLoading(false);
    };
    load();
  }, [open, authorName, deviceId]);

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from('community_posts').delete().eq('id', postId);
    if (error) {
      toast.error('Failed to delete post');
    } else {
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted');
    }
  };

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

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm max-h-[80vh] rounded-2xl bg-card border border-border shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors z-10"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="pt-8 pb-4 px-6 flex flex-col items-center text-center shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold mb-3">
                {authorName[0]?.toUpperCase()}
              </div>

              <h3 className="font-display font-bold text-lg text-card-foreground">
                {authorName} {isSelf && <span className="text-xs text-muted-foreground font-normal">(You)</span>}
              </h3>

              {loading ? (
                <p className="text-xs text-muted-foreground mt-2">Loading...</p>
              ) : (
                <>
                  <div className="flex gap-6 mt-3">
                    <div className="text-center">
                      <p className="font-bold text-card-foreground text-lg">{posts.length}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Posts</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-card-foreground text-lg">{subscriberCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Subscribers</p>
                    </div>
                  </div>

                  {!isSelf && (
                    <button
                      onClick={toggleSubscribe}
                      className={`mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        subscribed
                          ? 'bg-secondary text-secondary-foreground hover:bg-destructive/10 hover:text-destructive'
                          : 'bg-primary text-primary-foreground hover:opacity-90'
                      }`}
                    >
                      {subscribed ? <UserCheck size={16} /> : <UserPlus size={16} />}
                      {subscribed ? 'Subscribed' : 'Subscribe'}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Posts list */}
            {!loading && posts.length > 0 && (
              <div className="border-t border-border overflow-y-auto flex-1 px-4 py-3 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
                  {isSelf ? 'Your Posts' : 'Posts'}
                </p>
                {posts.map(p => (
                  <div key={p.id} className="rounded-xl bg-background border border-border p-3">
                    <h4 className="font-display font-bold text-sm text-card-foreground">{p.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.content}</p>
                    {p.image_url && (
                      isImage(p.image_url) ? (
                        <img src={p.image_url} alt="" className="rounded-lg mt-2 max-h-24 w-full object-cover" loading="lazy" />
                      ) : (
                        <a href={p.image_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 mt-2 text-[10px] text-primary">
                          <FileText size={12} /> View attachment
                        </a>
                      )
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart size={10} /> {p.likes}</span>
                      <span>{timeAgo(p.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && posts.length === 0 && (
              <div className="border-t border-border px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground">No posts yet</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

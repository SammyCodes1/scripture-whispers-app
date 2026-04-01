import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Plus, X, Send, Loader2, Image, FileText, Trash2, User, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/hooks/useDeviceId';
import { toast } from 'sonner';
import AuthorProfile from '@/components/AuthorProfile';
import { useAvatars } from '@/hooks/useAvatars';
import { cachePosts, getCachedPosts, cacheComments, getCachedComments, isOffline, enqueue, processQueue, getQueueCount, storeOfflineFile } from '@/hooks/useCommunityCache';
interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface Post {
  id: string;
  author_name: string;
  title: string;
  content: string;
  likes: number;
  image_url: string | null;
  device_id: string | null;
  created_at: string;
  comments?: Comment[];
}

export default function Community() {
  const [posts, setPosts] = useState<Post[]>(() => getCachedPosts() as Post[]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState(() => {
    try { return localStorage.getItem('hw-community-author') || ''; } catch { return ''; }
  });
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('hw-liked-posts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [profileAuthor, setProfileAuthor] = useState<string | null>(null);
  const { avatars, refresh: refreshAvatars } = useAvatars();

  useEffect(() => {
    const handleOnline = async () => {
      setOffline(false);
      // Process any queued offline actions first
      const synced = await processQueue(() => loadPosts());
      if (synced === 0) loadPosts();
    };
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!isOffline()) {
      // Process queue on mount too (in case user refreshed while online)
      processQueue(() => loadPosts()).then(synced => {
        if (synced === 0) loadPosts();
      });
      const channel = supabase
        .channel('community')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => loadPosts())
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      const cached = getCachedPosts() as Post[];
      if (cached.length > 0) setPosts(cached);
      setLoading(false);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Clean up file preview URL
  useEffect(() => {
    return () => { if (filePreview) URL.revokeObjectURL(filePreview); };
  }, [filePreview]);

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Error loading posts:', error);
    else {
      setPosts(data || []);
      cachePosts(data || []);
    }
    setLoading(false);
  };

  const loadComments = async (postId: string) => {
    if (isOffline()) {
      const cached = getCachedComments();
      if (cached[postId]) setComments(prev => ({ ...prev, [postId]: cached[postId] }));
      return;
    }
    const { data } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (data) {
      setComments(prev => ({ ...prev, [postId]: data }));
      cacheComments(postId, data);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('community-attachments')
      .upload(path, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage
      .from('community-attachments')
      .getPublicUrl(path);

    return data.publicUrl;
  };

  const createPost = async () => {
    if (!title.trim() || !content.trim() || !author.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (isOffline()) {
      // Store file in IndexedDB if present
      let fileKey: string | undefined;
      if (selectedFile) {
        fileKey = `offline-file-${Date.now()}`;
        try {
          await storeOfflineFile(fileKey, selectedFile);
        } catch {
          toast.error('Failed to save file offline');
          return;
        }
      }
      enqueue({
        type: 'post',
        title: title.trim(),
        content: content.trim(),
        authorName: author.trim(),
        fileKey,
        timestamp: Date.now(),
      });
      // Add optimistic local post
      const tempPost: Post = {
        id: `offline-${Date.now()}`,
        author_name: author.trim(),
        title: title.trim(),
        content: content.trim(),
        likes: 0,
        image_url: filePreview || null,
        device_id: getDeviceId(),
        created_at: new Date().toISOString(),
      };
      setPosts(prev => [tempPost, ...prev]);
      localStorage.setItem('hw-community-author', author.trim());
      setTitle('');
      setContent('');
      removeFile();
      setShowForm(false);
      toast.success(selectedFile ? 'Idea saved with attachment — will publish when back online' : 'Idea saved — will publish when back online');
      return;
    }

    setUploading(true);
    let imageUrl: string | null = null;

    if (selectedFile) {
      imageUrl = await uploadFile(selectedFile);
      if (!imageUrl) {
        toast.error('Failed to upload file');
        setUploading(false);
        return;
      }
    }

    const { error } = await supabase.from('community_posts').insert({
      author_name: author.trim(),
      title: title.trim(),
      content: content.trim(),
      image_url: imageUrl,
      device_id: getDeviceId(),
    } as any);

    if (error) {
      toast.error('Failed to publish');
    } else {
      localStorage.setItem('hw-community-author', author.trim());
      setTitle('');
      setContent('');
      removeFile();
      setShowForm(false);
      toast.success('Idea published!');
    }
    setUploading(false);
  };

  const toggleLike = async (post: Post) => {
    const isLiked = likedPosts.has(post.id);
    const newLikes = isLiked ? post.likes - 1 : post.likes + 1;
    const newLikedPosts = new Set(likedPosts);
    if (isLiked) newLikedPosts.delete(post.id);
    else newLikedPosts.add(post.id);
    setLikedPosts(newLikedPosts);
    localStorage.setItem('hw-liked-posts', JSON.stringify([...newLikedPosts]));

    // Update local state optimistically
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: Math.max(0, newLikes) } : p));

    if (isOffline()) {
      enqueue({
        type: 'like',
        postId: post.id,
        postTitle: post.title,
        newLikes: Math.max(0, newLikes),
        unlike: isLiked,
        postDeviceId: post.device_id,
        timestamp: Date.now(),
      });
      toast.success(isLiked ? 'Unlike saved — will sync when online' : 'Like saved — will sync when online');
      return;
    }

    await supabase.from('community_posts').update({ likes: Math.max(0, newLikes) }).eq('id', post.id);

    if (!isLiked && post.device_id && post.device_id !== getDeviceId()) {
      await supabase.from('notifications').insert({
        device_id: post.device_id,
        post_id: post.id,
        type: 'like',
        actor_name: 'Someone',
        message: `Someone liked your post "${post.title}"`,
      } as any);
    }

    loadPosts();
  };

  const addComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;
    const post = posts.find(p => p.id === postId);
    const commentAuthor = author.trim() || 'Anonymous';

    if (isOffline()) {
      // Add optimistic local comment
      const tempComment: Comment = {
        id: `offline-${Date.now()}`,
        author_name: commentAuthor,
        content: text,
        created_at: new Date().toISOString(),
      };
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), tempComment] }));
      setCommentText(prev => ({ ...prev, [postId]: '' }));
      enqueue({
        type: 'comment',
        postId,
        postTitle: post?.title || '',
        content: text,
        authorName: commentAuthor,
        postDeviceId: post?.device_id || null,
        timestamp: Date.now(),
      });
      toast.success('Comment saved — will sync when online');
      return;
    }

    const { error } = await supabase.from('community_comments').insert({
      post_id: postId,
      author_name: commentAuthor,
      content: text,
    });
    if (error) toast.error('Failed to add comment');
    else {
      setCommentText(prev => ({ ...prev, [postId]: '' }));
      toast.success('Comment added');
      loadComments(postId);

      if (post?.device_id && post.device_id !== getDeviceId()) {
        await supabase.from('notifications').insert({
          device_id: post.device_id,
          post_id: postId,
          type: 'comment',
          actor_name: commentAuthor,
          message: `${commentAuthor} commented on your post "${post.title}"`,
        } as any);
      }
    }
  };

  const handleShowComments = (postId: string) => {
    if (showComments === postId) setShowComments(null);
    else { setShowComments(postId); loadComments(postId); }
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

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {offline && (
        <div className="flex items-center gap-2 rounded-lg bg-muted border border-border px-3 py-2 mb-4 text-xs text-muted-foreground">
          <WifiOff size={14} className="shrink-0" />
          <span>You're offline — actions will sync when you reconnect.{getQueueCount() > 0 && ` (${getQueueCount()} pending)`}</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold text-foreground">Community</h2>
        <div className="flex items-center gap-2">
          {author.trim() && (
            <button
              onClick={() => setProfileAuthor(author.trim())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              <User size={16} />
              My Profile
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'Share Idea'}
          </button>
        </div>
      </div>

      {/* Create Post Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl bg-card border border-border p-4 mb-4 space-y-3"
        >
          <input
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="w-full rounded-lg bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Topic title"
            maxLength={100}
            className="w-full rounded-lg bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            maxLength={500}
            rows={3}
            className="w-full rounded-lg bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
          />

          {/* File attachment area */}
          {selectedFile ? (
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedFile.type.startsWith('image/') ? <Image size={16} className="text-primary shrink-0" /> : <FileText size={16} className="text-primary shrink-0" />}
                  <span className="text-xs text-foreground truncate">{selectedFile.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button onClick={removeFile} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              {filePreview && (
                <img src={filePreview} alt="Preview" className="rounded-lg max-h-48 w-full object-cover" />
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                <Image size={14} />
                Add Photo
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </label>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                <FileText size={14} />
                Add Document
                <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileSelect} />
              </label>
            </div>
          )}

          <button
            onClick={createPost}
            disabled={uploading}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading && <Loader2 size={16} className="animate-spin" />}
            {uploading ? 'Uploading…' : 'Publish Idea'}
          </button>
        </motion.div>
      )}

      {/* Posts */}
      <div className="space-y-3">
        {posts.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">No posts yet. Be the first to share!</p>
        )}
        {posts.map(post => (
          <div key={post.id} className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setProfileAuthor(post.author_name)}
                className="flex items-center gap-2 group/author"
              >
                {avatars[post.author_name] ? (
                  <img src={avatars[post.author_name]} alt={post.author_name} className="w-8 h-8 rounded-full object-cover group-hover/author:ring-2 group-hover/author:ring-primary transition-all" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold group-hover/author:ring-2 group-hover/author:ring-primary transition-all">
                    {post.author_name[0]}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-card-foreground group-hover/author:text-primary transition-colors">{post.author_name}</p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</p>
                </div>
              </button>
              {post.device_id === getDeviceId() && (
                <button
                  onClick={async () => {
                    const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
                    if (error) toast.error('Failed to delete');
                    else { toast.success('Post deleted'); loadPosts(); }
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete post"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <h3 className="font-display font-bold text-card-foreground mb-1">{post.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{post.content}</p>

            {/* Attached image or document */}
            {post.image_url && (
              isImage(post.image_url) ? (
                <a href={post.image_url} target="_blank" rel="noopener noreferrer" className="block mb-3">
                  <img
                    src={post.image_url}
                    alt="Attachment"
                    className="rounded-lg max-h-64 w-full object-cover border border-border"
                    loading="lazy"
                  />
                </a>
              ) : (
                <a
                  href={post.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 mb-3 text-xs text-primary hover:bg-primary/5 transition-colors"
                >
                  <FileText size={16} />
                  View attached document
                </a>
              )
            )}

            <div className="flex items-center gap-4 border-t border-border pt-2">
              <button
                onClick={() => toggleLike(post)}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  likedPosts.has(post.id) ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Heart size={16} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} />
                {post.likes}
              </button>
              <button
                onClick={() => handleShowComments(post.id)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle size={16} />
                {(comments[post.id] || []).length}
              </button>
            </div>

            {/* Comments */}
            {showComments === post.id && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 border-t border-border pt-3 space-y-2"
              >
                {(comments[post.id] || []).map(c => (
                  <div key={c.id} className="rounded-lg bg-background p-2">
                    <p className="text-xs font-medium text-foreground">{c.author_name}</p>
                    <p className="text-xs text-muted-foreground">{c.content}</p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={commentText[post.id] || ''}
                    onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                    placeholder="Write a comment..."
                    maxLength={200}
                    className="flex-1 rounded-lg bg-background border border-input px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => addComment(post.id)}
                    className="p-1.5 rounded-lg bg-primary text-primary-foreground"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Author Profile Popup */}
      <AuthorProfile
        authorName={profileAuthor || ''}
        open={!!profileAuthor}
        onClose={() => setProfileAuthor(null)}
        isSelf={!!author.trim() && profileAuthor === author.trim()}
        avatarUrl={profileAuthor ? avatars[profileAuthor] : undefined}
        onAvatarChange={refreshAvatars}
      />
    </div>
  );
}

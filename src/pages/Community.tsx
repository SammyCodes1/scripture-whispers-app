import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Plus, X, Send } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

interface Post {
  id: string;
  author: string;
  title: string;
  content: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
  createdAt: number;
}

const SEED_POSTS: Post[] = [
  {
    id: 'seed-1',
    author: 'Grace W.',
    title: 'The Power of Morning Devotion',
    content: 'Starting each day with scripture has transformed my life. I\'ve been reading Proverbs every morning and the wisdom is incredible. Who else does morning devotions?',
    likes: 12,
    liked: false,
    comments: [
      { id: 'c1', author: 'David K.', text: 'I do! Psalms in the morning is my favorite.', createdAt: Date.now() - 86400000 }
    ],
    createdAt: Date.now() - 172800000,
  },
  {
    id: 'seed-2',
    author: 'James M.',
    title: 'Understanding Romans 8:28',
    content: 'This verse has been my anchor during difficult times. All things truly work together for good. How has this verse impacted your life?',
    likes: 8,
    liked: false,
    comments: [],
    createdAt: Date.now() - 345600000,
  },
];

export default function Community() {
  const [posts, setPosts] = useLocalStorage<Post[]>('hw-posts', SEED_POSTS);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<string | null>(null);

  const createPost = () => {
    if (!title.trim() || !content.trim() || !author.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    const post: Post = {
      id: Date.now().toString(),
      author: author.trim(),
      title: title.trim(),
      content: content.trim(),
      likes: 0,
      liked: false,
      comments: [],
      createdAt: Date.now(),
    };
    setPosts(prev => [post, ...prev]);
    setTitle('');
    setContent('');
    setShowForm(false);
    toast.success('Idea published!');
  };

  const toggleLike = (id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const addComment = (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;
    setPosts(prev => prev.map(p =>
      p.id === postId ? {
        ...p,
        comments: [...p.comments, { id: Date.now().toString(), author: 'You', text, createdAt: Date.now() }]
      } : p
    ));
    setCommentText(prev => ({ ...prev, [postId]: '' }));
    toast.success('Comment added');
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold text-foreground">Community</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Share Idea'}
        </button>
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
          <button
            onClick={createPost}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium hover:opacity-90 transition"
          >
            Publish Idea
          </button>
        </motion.div>
      )}

      {/* Posts */}
      <div className="space-y-3">
        {posts.map(post => (
          <div key={post.id} className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                {post.author[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">{post.author}</p>
                <p className="text-[10px] text-muted-foreground">{timeAgo(post.createdAt)}</p>
              </div>
            </div>
            <h3 className="font-display font-bold text-card-foreground mb-1">{post.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{post.content}</p>

            <div className="flex items-center gap-4 border-t border-border pt-2">
              <button
                onClick={() => toggleLike(post.id)}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  post.liked ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Heart size={16} fill={post.liked ? 'currentColor' : 'none'} />
                {post.likes}
              </button>
              <button
                onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle size={16} />
                {post.comments.length}
              </button>
            </div>

            {/* Comments */}
            {showComments === post.id && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 border-t border-border pt-3 space-y-2"
              >
                {post.comments.map(c => (
                  <div key={c.id} className="rounded-lg bg-background p-2">
                    <p className="text-xs font-medium text-foreground">{c.author}</p>
                    <p className="text-xs text-muted-foreground">{c.text}</p>
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
    </div>
  );
}

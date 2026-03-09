const POSTS_KEY = 'hw-community-posts-cache';
const COMMENTS_KEY = 'hw-community-comments-cache';
const PROFILES_KEY = 'hw-community-profiles-cache';

export interface CachedPost {
  id: string;
  author_name: string;
  title: string;
  content: string;
  likes: number;
  image_url: string | null;
  device_id: string | null;
  created_at: string;
}

export interface CachedComment {
  id: string;
  post_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface CachedProfile {
  author_name: string;
  avatar_url: string | null;
  subscriber_count: number;
}

export function cachePosts(posts: CachedPost[]) {
  try { localStorage.setItem(POSTS_KEY, JSON.stringify(posts)); } catch {}
}

export function getCachedPosts(): CachedPost[] {
  try {
    const d = localStorage.getItem(POSTS_KEY);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}

export function cacheComments(postId: string, comments: CachedComment[]) {
  try {
    const all = getCachedComments();
    all[postId] = comments;
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
  } catch {}
}

export function getCachedComments(): Record<string, CachedComment[]> {
  try {
    const d = localStorage.getItem(COMMENTS_KEY);
    return d ? JSON.parse(d) : {};
  } catch { return {}; }
}

export function cacheProfile(profile: CachedProfile) {
  try {
    const all = getCachedProfiles();
    all[profile.author_name] = profile;
    localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
  } catch {}
}

export function getCachedProfiles(): Record<string, CachedProfile> {
  try {
    const d = localStorage.getItem(PROFILES_KEY);
    return d ? JSON.parse(d) : {};
  } catch { return {}; }
}

export function isOffline(): boolean {
  return !navigator.onLine;
}

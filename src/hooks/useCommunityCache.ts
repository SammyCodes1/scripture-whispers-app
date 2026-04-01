import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/hooks/useDeviceId';
import { toast } from 'sonner';

const POSTS_KEY = 'hw-community-posts-cache';
const COMMENTS_KEY = 'hw-community-comments-cache';
const PROFILES_KEY = 'hw-community-profiles-cache';
const QUEUE_KEY = 'hw-offline-queue';

// ── IndexedDB for binary file storage ──
const FILE_DB_NAME = 'hw-offline-files';
const FILE_DB_VERSION = 1;
const FILE_STORE = 'files';

function openFileDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FILE_DB_NAME, FILE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeOfflineFile(key: string, file: File): Promise<void> {
  const db = await openFileDB();
  const buffer = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readwrite');
    tx.objectStore(FILE_STORE).put({ buffer, name: file.name, type: file.type, size: file.size }, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineFile(key: string): Promise<File | null> {
  try {
    const db = await openFileDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readonly');
      const req = tx.objectStore(FILE_STORE).get(key);
      req.onsuccess = () => {
        const data = req.result;
        if (!data) return resolve(null);
        const file = new File([data.buffer], data.name, { type: data.type });
        resolve(file);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteOfflineFile(key: string): Promise<void> {
  try {
    const db = await openFileDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readwrite');
      tx.objectStore(FILE_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

// ── Cached data types ──

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

// ── Offline queue types ──

interface QueuedLike {
  type: 'like';
  postId: string;
  postTitle: string;
  newLikes: number;
  unlike: boolean;
  postDeviceId: string | null;
  timestamp: number;
}

interface QueuedComment {
  type: 'comment';
  postId: string;
  postTitle: string;
  content: string;
  authorName: string;
  postDeviceId: string | null;
  timestamp: number;
}

interface QueuedPost {
  type: 'post';
  title: string;
  content: string;
  authorName: string;
  fileKey?: string; // IndexedDB key for attached file
  timestamp: number;
}

export type QueuedAction = QueuedLike | QueuedComment | QueuedPost;

// ── Cache read/write ──

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

// ── Offline queue ──

export function getQueue(): QueuedAction[] {
  try {
    const d = localStorage.getItem(QUEUE_KEY);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}

function saveQueue(queue: QueuedAction[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
}

export function enqueue(action: QueuedAction) {
  const queue = getQueue();
  queue.push(action);
  saveQueue(queue);
}

export function getQueueCount(): number {
  return getQueue().length;
}

/** Upload a file to Supabase storage */
async function uploadFileToStorage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('community-attachments').upload(path, file);
  if (error) return null;
  const { data } = supabase.storage.from('community-attachments').getPublicUrl(path);
  return data.publicUrl;
}

/** Process all queued actions and sync to the server */
export async function processQueue(onDone?: () => void): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let processed = 0;
  const failed: QueuedAction[] = [];
  const deviceId = getDeviceId();

  for (const action of queue) {
    try {
      if (action.type === 'like') {
        await supabase
          .from('community_posts')
          .update({ likes: Math.max(0, action.newLikes) })
          .eq('id', action.postId);

        if (!action.unlike && action.postDeviceId && action.postDeviceId !== deviceId) {
          await supabase.from('notifications').insert({
            device_id: action.postDeviceId,
            post_id: action.postId,
            type: 'like',
            actor_name: 'Someone',
            message: `Someone liked your post "${action.postTitle}"`,
          } as any);
        }
        processed++;
      } else if (action.type === 'comment') {
        const { error } = await supabase.from('community_comments').insert({
          post_id: action.postId,
          author_name: action.authorName,
          content: action.content,
        });
        if (!error) {
          if (action.postDeviceId && action.postDeviceId !== deviceId) {
            await supabase.from('notifications').insert({
              device_id: action.postDeviceId,
              post_id: action.postId,
              type: 'comment',
              actor_name: action.authorName,
              message: `${action.authorName} commented on your post "${action.postTitle}"`,
            } as any);
          }
          processed++;
        } else {
          failed.push(action);
        }
      } else if (action.type === 'post') {
        let imageUrl: string | null = null;

        // Upload queued file from IndexedDB if present
        if (action.fileKey) {
          const file = await getOfflineFile(action.fileKey);
          if (file) {
            imageUrl = await uploadFileToStorage(file);
            if (imageUrl) {
              await deleteOfflineFile(action.fileKey);
            }
          }
        }

        const { error } = await supabase.from('community_posts').insert({
          author_name: action.authorName,
          title: action.title,
          content: action.content,
          image_url: imageUrl,
          device_id: deviceId,
        } as any);
        if (!error) {
          processed++;
        } else {
          failed.push(action);
        }
      }
    } catch {
      failed.push(action);
    }
  }

  saveQueue(failed);

  if (processed > 0) {
    toast.success(`Synced ${processed} offline action${processed > 1 ? 's' : ''}`);
  }
  if (failed.length > 0) {
    toast.error(`${failed.length} action${failed.length > 1 ? 's' : ''} failed to sync — will retry later`);
  }

  onDone?.();
  return processed;
}

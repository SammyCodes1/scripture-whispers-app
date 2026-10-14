import { useEffect, useState } from 'react';
import { HeartHandshake, Loader2, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/hooks/useDeviceId';
import { toast } from 'sonner';

interface Prayer {
  id: string;
  author_name: string;
  request: string;
  device_id: string | null;
  prayed_count: number;
  created_at: string;
}

const PRAYERS_KEY = 'hw-prayers';
const PRAYED_KEY = 'hw-prayed-ids';

function readPrayers(): Prayer[] {
  try {
    const raw = localStorage.getItem(PRAYERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePrayers(prayers: Prayer[]) {
  try { localStorage.setItem(PRAYERS_KEY, JSON.stringify(prayers)); } catch {}
}

function readPrayed(): Set<string> {
  try {
    const raw = localStorage.getItem(PRAYED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writePrayed(ids: Set<string>) {
  try { localStorage.setItem(PRAYED_KEY, JSON.stringify([...ids])); } catch {}
}

function missingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === 'PGRST205'
    || error.code === '42P01'
    || /could not find the table|does not exist/i.test(error.message || '');
}

function timeAgo(ts: string) {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PrayerWall() {
  const [prayers, setPrayers] = useState<Prayer[]>(() => readPrayers());
  const [prayed, setPrayed] = useState<Set<string>>(() => readPrayed());
  const [shared, setShared] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState(() => localStorage.getItem('hw-community-author') || '');
  const [request, setRequest] = useState('');
  const [saving, setSaving] = useState(false);
  const deviceId = getDeviceId();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error || !data) {
        setShared(false);
        setLoading(false);
        return;
      }
      const rows = data as Prayer[];
      setPrayers(rows);
      writePrayers(rows);
      setShared(true);
      const marks = await supabase
        .from('prayer_marks')
        .select('prayer_id')
        .eq('device_id', deviceId);
      if (!cancelled && marks.data) {
        const ids = new Set(marks.data.map(mark => mark.prayer_id));
        setPrayed(ids);
        writePrayed(ids);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [deviceId]);

  const saveLocal = (next: Prayer[], marks = prayed) => {
    setPrayers(next);
    writePrayers(next);
    setPrayed(marks);
    writePrayed(marks);
  };

  const sharePrayer = async () => {
    const name = author.trim();
    const text = request.trim();
    if (!name || !text) {
      toast.error('Add your name and a prayer request');
      return;
    }
    setSaving(true);
    localStorage.setItem('hw-community-author', name);
    const local: Prayer = {
      id: crypto.randomUUID(),
      author_name: name,
      request: text,
      device_id: deviceId,
      prayed_count: 0,
      created_at: new Date().toISOString(),
    };

    if (!shared) {
      saveLocal([local, ...prayers]);
      setRequest('');
      setShowForm(false);
      setSaving(false);
      toast.success('Prayer saved on this device');
      return;
    }

    const { data, error } = await supabase
      .from('prayer_requests')
      .insert({ author_name: name, request: text, device_id: deviceId })
      .select('*')
      .single();
    if (error || !data) {
      if (missingTable(error)) {
        setShared(false);
        saveLocal([local, ...prayers]);
        setRequest('');
        setShowForm(false);
        toast.success('Prayer saved on this device');
      } else {
        toast.error('Could not share this prayer');
      }
      setSaving(false);
      return;
    }
    const next = [data as Prayer, ...prayers];
    saveLocal(next);
    setRequest('');
    setShowForm(false);
    setSaving(false);
    toast.success('Prayer shared');
  };

  const togglePrayed = async (prayer: Prayer) => {
    const already = prayed.has(prayer.id);
    const nextMarks = new Set(prayed);
    if (already) nextMarks.delete(prayer.id);
    else nextMarks.add(prayer.id);
    const nextPrayers = prayers.map(item => item.id === prayer.id
      ? { ...item, prayed_count: Math.max(0, item.prayed_count + (already ? -1 : 1)) }
      : item);
    saveLocal(nextPrayers, nextMarks);
    if (!shared) return;

    if (already) {
      const { error } = await supabase.from('prayer_marks').delete().eq('prayer_id', prayer.id).eq('device_id', deviceId);
      if (error && !missingTable(error)) {
        saveLocal(prayers, prayed);
        toast.error('Could not update this prayer');
      }
      return;
    }
    const { error } = await supabase.from('prayer_marks').insert({ prayer_id: prayer.id, device_id: deviceId });
    if (error && error.code !== '23505') {
      if (missingTable(error)) setShared(false);
      else {
        saveLocal(prayers, prayed);
        toast.error('Could not update this prayer');
      }
    }
  };

  const removePrayer = async (prayer: Prayer) => {
    const next = prayers.filter(item => item.id !== prayer.id);
    const nextMarks = new Set(prayed);
    nextMarks.delete(prayer.id);
    saveLocal(next, nextMarks);
    if (!shared) return;
    const { error } = await supabase.from('prayer_requests').delete().eq('id', prayer.id).eq('device_id', deviceId);
    if (error && !missingTable(error)) {
      saveLocal(prayers, prayed);
      toast.error('Could not remove this prayer');
    }
  };

  return (
    <div>
      {!shared && (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Prayers are saved on this device. They will show for everyone after the prayer wall database update.
        </p>
      )}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowForm(open => !open)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Share a prayer'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-xl border border-border bg-card p-4">
          <input
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={request}
            onChange={e => setRequest(e.target.value)}
            placeholder="What can we pray for?"
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => { void sharePrayer(); }}
            disabled={saving || !author.trim() || !request.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Sharing...' : 'Share request'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : prayers.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm leading-relaxed text-muted-foreground">
          No prayers yet. Share a request, then mark it when you have prayed.
        </p>
      ) : (
        <div className="space-y-3">
          {prayers.map(prayer => {
            const mine = prayer.device_id === deviceId;
            const marked = prayed.has(prayer.id);
            return (
              <article key={prayer.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{prayer.author_name}</p>
                    <p className="text-[11px] text-muted-foreground">{timeAgo(prayer.created_at)}</p>
                  </div>
                  {mine && (
                    <button
                      onClick={() => { void removePrayer(prayer); }}
                      aria-label="Remove prayer"
                      className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{prayer.request}</p>
                <button
                  onClick={() => { void togglePrayed(prayer); }}
                  className={`mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    marked ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground hover:text-foreground'
                  }`}
                >
                  <HeartHandshake size={16} />
                  {marked ? 'Prayed' : 'I prayed'}
                  <span className="tabular-nums">{prayer.prayed_count}</span>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

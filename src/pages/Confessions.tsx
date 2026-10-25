import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, HandHeart, Copy, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CONFESSIONS, PRAYERS, getDailyConfession, getDailyPrayer } from '@/data/confessionsData';
import { toast } from 'sonner';

type Tab = 'confessions' | 'prayers';

export default function ConfessionsPage() {
  const [tab, setTab] = useState<Tab>('confessions');
  const [selectedIndex, setSelectedIndex] = useState(() => new Date().getDate() - 1);

  const items = tab === 'confessions' ? CONFESSIONS : PRAYERS;
  const current = items[selectedIndex % items.length];
  const isToday = selectedIndex === new Date().getDate() - 1;

  const prev = () => setSelectedIndex(i => (i - 1 + items.length) % items.length);
  const next = () => setSelectedIndex(i => (i + 1) % items.length);

  const copyText = () => {
    const text = tab === 'confessions'
      ? `${current.title}\n\n${(current as any).confession}\n\n📖 ${current.scripture}\n— ${current.scriptureRef}`
      : `${current.title}\n\n${(current as any).prayer}\n\n📖 ${current.scripture}\n— ${current.scriptureRef}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const shareText = async () => {
    const text = tab === 'confessions'
      ? `✝️ ${current.title}\n\n${(current as any).confession}\n\n📖 ${current.scriptureRef}`
      : `🙏 ${current.title}\n\n${(current as any).prayer}\n\n📖 ${current.scriptureRef}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
  };

  const body = tab === 'confessions' ? (current as any).confession : (current as any).prayer;

  return (
    <div className="fade-in space-y-4">
      <h2 className="font-display text-xl font-bold text-foreground">Daily Confessions & Prayers</h2>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTab('confessions'); setSelectedIndex(new Date().getDate() - 1); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'confessions' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <Flame size={16} /> Confessions
        </button>
        <button
          onClick={() => { setTab('prayers'); setSelectedIndex(new Date().getDate() - 1); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'prayers' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <HandHeart size={16} /> Prayers
        </button>
      </div>

      {/* Daily highlight */}
      <motion.div
        key={`${tab}-${selectedIndex}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-xl bg-primary p-5 text-primary-foreground shadow-lg"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs uppercase tracking-widest">
            {isToday ? (tab === 'confessions' ? "Today's Confession" : "Today's Prayer") : current.title}
          </p>
          <span className="text-xs">Day {(selectedIndex % items.length) + 1} / {items.length}</span>
        </div>
        {isToday && <p className="font-display text-lg font-bold mb-2">{current.title}</p>}
        <p className="text-sm leading-relaxed mb-4">{body}</p>

        <div className="border-t border-primary-foreground/20 pt-3">
          <p className="text-xs italic mb-1">"{current.scripture}"</p>
          <p className="text-xs">— {current.scriptureRef}</p>
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prev} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-primary/10 transition-colors">
          <ChevronLeft size={16} /> Previous
        </button>
        <div className="flex gap-2">
          <button onClick={copyText} className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-primary/10 transition-colors" title="Copy">
            <Copy size={16} />
          </button>
          <button onClick={shareText} className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-primary/10 transition-colors" title="Share">
            <Share2 size={16} />
          </button>
        </div>
        <button onClick={next} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-primary/10 transition-colors">
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* Browse all */}
      <div>
        <h3 className="font-display text-base font-bold text-foreground mb-3">
          All {tab === 'confessions' ? 'Confessions' : 'Prayers'}
        </h3>
        <div className="space-y-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setSelectedIndex(i)}
              className={`w-full text-left rounded-xl border p-3 transition-all ${
                i === selectedIndex % items.length
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-sm text-card-foreground">{item.title}</p>
                {i === new Date().getDate() - 1 && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Today</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{item.scriptureRef}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

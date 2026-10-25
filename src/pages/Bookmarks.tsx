import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Highlighter, Trash2, StickyNote, Pencil } from 'lucide-react';
import { versePath } from '@/lib/verseRef';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNotes } from '@/hooks/useNotes';
import VerseNoteModal from '@/components/VerseNoteModal';
import type { SavedVerse } from './Reader';
import { toast } from 'sonner';

type Tab = 'bookmark' | 'highlight' | 'note';

export default function BookmarksPage() {
  const navigate = useNavigate();
  const [savedVerses, setSavedVerses] = useLocalStorage<SavedVerse[]>('hw-saved-verses', []);
  const { notes, deleteNote } = useNotes();
  const [tab, setTab] = useState<Tab>('bookmark');
  const [editing, setEditing] = useState<{ ref: string; text: string } | null>(null);

  const filtered = savedVerses.filter(v => v.type === tab).sort((a, b) => b.createdAt - a.createdAt);
  const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  const remove = (id: string) => {
    setSavedVerses(prev => prev.filter(v => v.id !== id));
    toast.info('Removed');
  };

  const openRef = (ref: string) => {
    const path = versePath(ref);
    if (path) navigate(path);
  };

  const tabs: { id: Tab; label: string; icon: typeof Bookmark }[] = [
    { id: 'bookmark', label: 'Bookmarks', icon: Bookmark },
    { id: 'highlight', label: 'Highlights', icon: Highlighter },
    { id: 'note', label: 'Notes', icon: StickyNote },
  ];

  return (
    <div className="fade-in">
      <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight">
        Bookmarks, Highlights &amp; Notes
      </h2>

      <div className="flex gap-2 mb-3 sm:mb-4 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
              tab === id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'note' ? (
        sortedNotes.length === 0 ? (
          <div className="text-center py-10 sm:py-12 px-4">
            <p className="text-muted-foreground text-sm">No notes yet.</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Tap the note icon next to any verse while reading to write your thoughts.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedNotes.map(n => (
              <div key={n.id} className="rounded-xl bg-card border border-border border-l-4 border-l-note p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => openRef(n.ref)}
                    className="text-left text-[11px] sm:text-xs font-bold text-primary break-words flex-1 hover:underline"
                  >
                    {n.ref}
                  </button>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditing({ ref: n.ref, text: n.verseText })}
                      aria-label="Edit"
                      className="p-2 -m-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { deleteNote(n.ref); toast.info('Note deleted'); }}
                      aria-label="Delete"
                      className="p-2 -m-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="verse-text text-[12px] sm:text-[13px] leading-relaxed text-muted-foreground italic mb-2 line-clamp-2">
                  "{n.verseText}"
                </p>
                <p className="text-[13px] sm:text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {n.note}
                </p>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 sm:py-12 px-4">
          <p className="text-muted-foreground text-sm">
            No {tab === 'bookmark' ? 'bookmarks' : 'highlights'} yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Tap the {tab === 'bookmark' ? 'bookmark' : 'highlight'} icon while reading to save verses.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(verse => (
            <div
              key={verse.id}
              className={`rounded-xl bg-card border border-border p-3 sm:p-4 ${
                verse.type === 'highlight' ? 'verse-highlight' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openRef(verse.ref)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-[11px] sm:text-xs font-bold text-primary mb-1 break-words">{verse.ref}</p>
                  <p className={`verse-text text-[13px] sm:text-sm leading-relaxed break-words ${verse.type === 'highlight' ? 'verse-mark' : ''}`}>{verse.text}</p>
                </button>
                <button
                  onClick={() => remove(verse.id)}
                  aria-label="Remove"
                  className="shrink-0 p-2 -m-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <VerseNoteModal
        open={!!editing}
        reference={editing?.ref ?? ''}
        verseText={editing?.text ?? ''}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

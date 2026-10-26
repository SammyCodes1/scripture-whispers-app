import { useLocalStorage } from './useLocalStorage';
import { VERSE_NOTES_KEY } from '@/lib/verseLibrary';

export interface VerseNote {
  id: string;
  ref: string;
  verseText: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export function useNotes() {
  const [notes, setNotes] = useLocalStorage<VerseNote[]>(VERSE_NOTES_KEY, []);

  const getNote = (ref: string) => notes.find(n => n.ref === ref);

  const saveNote = (ref: string, verseText: string, note: string) => {
    const trimmed = note.trim();
    setNotes(prev => {
      const existing = prev.find(n => n.ref === ref);
      if (!trimmed) {
        // delete if empty
        return prev.filter(n => n.ref !== ref);
      }
      if (existing) {
        return prev.map(n =>
          n.ref === ref ? { ...n, note: trimmed, verseText, updatedAt: Date.now() } : n
        );
      }
      return [
        ...prev,
        {
          id: `note-${ref}-${Date.now()}`,
          ref,
          verseText,
          note: trimmed,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
    });
  };

  const deleteNote = (ref: string) => {
    setNotes(prev => prev.filter(n => n.ref !== ref));
  };

  return { notes, getNote, saveNote, deleteNote };
}

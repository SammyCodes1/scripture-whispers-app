import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useNotes } from '@/hooks/useNotes';

interface Props {
  open: boolean;
  reference: string;
  verseText: string;
  onClose: () => void;
}

export default function VerseNoteModal({ open, reference, verseText, onClose }: Props) {
  const { getNote, saveNote, deleteNote } = useNotes();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) {
      setValue(getNote(reference)?.note ?? '');
    }
  }, [open, reference]);

  if (!open) return null;

  const existing = getNote(reference);

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      if (existing) {
        deleteNote(reference);
        toast.info('Note removed');
      }
      onClose();
      return;
    }
    saveNote(reference, verseText, trimmed);
    toast.success('Note saved');
    onClose();
  };

  const handleDelete = () => {
    deleteNote(reference);
    toast.info('Note deleted');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary truncate">{reference}</p>
              <p className="text-[11px] text-muted-foreground">
                {existing ? 'Edit your note' : 'Add a note'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="verse-text text-xs leading-relaxed text-muted-foreground line-clamp-3 italic">
              "{verseText}"
            </p>
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              maxLength={2000}
              autoFocus
              placeholder="Write your reflection, prayer, or insight…"
              className="w-full min-h-[140px] resize-y rounded-xl bg-secondary/50 border border-border p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-[10px] text-muted-foreground text-right">{value.length}/2000</p>
          </div>

          <div className="flex items-center justify-between gap-2 p-3 border-t border-border bg-secondary/20">
            {existing ? (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Save size={14} /> Save
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

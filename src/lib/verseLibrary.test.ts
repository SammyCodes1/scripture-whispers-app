import { describe, expect, it } from 'vitest';
import {
  describeLibrary,
  emptyLibrary,
  generateLibraryCode,
  LIBRARY_CODE_RE,
  librarySignature,
  mergeLibraries,
  normalizeLibraryCode,
  sanitizePayload,
  type LibraryPayload,
} from './verseLibrary';

function verse(ref: string, type: 'bookmark' | 'highlight', createdAt: number, text = 'In the beginning'): LibraryPayload['saved'][number] {
  return { id: `${type}:${ref}`, ref, text, type, createdAt };
}

function note(ref: string, updatedAt: number, body: string): LibraryPayload['notes'][number] {
  return { id: `note:${ref}`, ref, verseText: 'In the beginning', note: body, createdAt: updatedAt, updatedAt };
}

describe('verse library', () => {
  it('accepts a generated code and a pasted code without hyphens', () => {
    const code = generateLibraryCode();
    expect(LIBRARY_CODE_RE.test(code)).toBe(true);
    expect(normalizeLibraryCode(code.replace(/-/g, ' '))).toBe(code);
    expect(normalizeLibraryCode('oooo-oooo-oooo-oooo')).toBeNull();
  });

  it('keeps both a bookmark and a highlight and the newer note', () => {
    const merged = mergeLibraries(
      { saved: [verse('John 3:16', 'bookmark', 10)], notes: [note('John 3:16', 10, 'first')], removed: [] },
      { saved: [verse('John 3:16', 'highlight', 12)], notes: [note('John 3:16', 20, 'second')], removed: [] },
    );
    expect(merged.saved.map(item => item.type).sort()).toEqual(['bookmark', 'highlight']);
    expect(merged.notes).toHaveLength(1);
    expect(merged.notes[0].note).toBe('second');
  });

  it('drops a saved verse when a newer tombstone exists and keeps a later re-save', () => {
    const removed = mergeLibraries(
      { saved: [verse('Micah 6:8', 'bookmark', 10)], notes: [], removed: [] },
      { ...emptyLibrary(), removed: [{ key: 'bookmark:Micah 6:8', at: 20 }] },
    );
    expect(removed.saved).toHaveLength(0);
    expect(removed.removed).toEqual([{ key: 'bookmark:Micah 6:8', at: 20 }]);

    const again = mergeLibraries(removed, {
      saved: [verse('Micah 6:8', 'bookmark', 30, 'He has shown you')],
      notes: [],
      removed: [],
    });
    expect(again.saved).toHaveLength(1);
    expect(again.saved[0].text).toBe('He has shown you');
    expect(again.removed).toHaveLength(0);
  });

  it('strips a note that is not a note and describes what remains', () => {
    const clean = sanitizePayload({
      saved: [{ ref: 'Psalm 23:1', type: 'bookmark', text: 'The Lord is my shepherd.', createdAt: Date.now(), color: 'yellow' }],
      notes: [{ ref: 'Psalm 23:1', note: '   ', updatedAt: Date.now() }],
      removed: [{ key: 'nope', at: Date.now() }],
    });
    expect(clean.saved).toHaveLength(1);
    expect(clean.notes).toHaveLength(0);
    expect(clean.removed).toHaveLength(0);
    expect(describeLibrary(clean)).toBe('Restored 1 bookmark.');
    expect(librarySignature(clean)).toBe(librarySignature(sanitizePayload(clean)));
  });
});

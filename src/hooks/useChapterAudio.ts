import { useState, useEffect, useCallback, useRef } from 'react';
import type { BibleVerse } from './useBibleApi';

export function useChapterAudio(verses: BibleVerse[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const indexRef = useRef(0);
  const cancelledRef = useRef(false);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentVerseIndex(-1);
  }, []);

  const speakVerse = useCallback((index: number) => {
    if (index >= verses.length || cancelledRef.current) {
      setIsPlaying(false);
      setCurrentVerseIndex(-1);
      return;
    }

    setCurrentVerseIndex(index);
    indexRef.current = index;

    const utt = new SpeechSynthesisUtterance(verses[index].text);
    utt.rate = 0.9;
    utt.pitch = 1;
    utt.onend = () => {
      if (!cancelledRef.current) {
        speakVerse(index + 1);
      }
    };
    utt.onerror = () => {
      if (!cancelledRef.current) {
        speakVerse(index + 1);
      }
    };
    utteranceRef.current = utt;
    speechSynthesis.speak(utt);
  }, [verses]);

  const play = useCallback((startIndex = 0) => {
    stop();
    cancelledRef.current = false;
    setIsPlaying(true);
    // Small delay to let cancel finish
    setTimeout(() => speakVerse(startIndex), 100);
  }, [stop, speakVerse]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      play(0);
    }
  }, [isPlaying, stop, play]);

  // Cleanup on unmount or verses change
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      speechSynthesis.cancel();
    };
  }, [verses]);

  return { isPlaying, currentVerseIndex, play, stop, toggle };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BibleVerse } from './useBibleApi';
import { useLocalStorage } from './useLocalStorage';

export interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
}

export const VOICE_STORAGE_KEY = 'hw-selected-voice';
export const SPEED_STORAGE_KEY = 'hw-reading-speed';

export function useChapterAudio(verses: BibleVerse[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(-1);
  const [selectedVoice] = useLocalStorage<string>(VOICE_STORAGE_KEY, '');
  const [speed] = useLocalStorage<number>(SPEED_STORAGE_KEY, 1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const indexRef = useRef(0);
  const cancelledRef = useRef(false);
  const runRef = useRef(0);
  const speedRef = useRef(speed);

  // Keep speedRef in sync so the closure always reads the latest value
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const getVoice = useCallback(() => {
    if (!selectedVoice) return null;
    const voices = speechSynthesis.getVoices();
    return voices.find(v => v.voiceURI === selectedVoice) || null;
  }, [selectedVoice]);

  const stop = useCallback(() => {
    runRef.current += 1;
    cancelledRef.current = true;
    speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentVerseIndex(-1);
  }, []);

  const speakVerse = useCallback((index: number, run: number) => {
    if (run !== runRef.current) return;
    if (index >= verses.length || cancelledRef.current) {
      setIsPlaying(false);
      setCurrentVerseIndex(-1);
      return;
    }

    setCurrentVerseIndex(index);
    indexRef.current = index;

    const utt = new SpeechSynthesisUtterance(verses[index].text);
    utt.rate = speedRef.current;
    utt.pitch = 1;

    const voice = getVoice();
    if (voice) utt.voice = voice;

    const stillCurrent = () => run === runRef.current && !cancelledRef.current;
    utt.onend = () => {
      if (stillCurrent()) speakVerse(index + 1, run);
    };
    // cancel() rejects the utterance. Ignore that so a stopped verse cannot start the next one.
    utt.onerror = (event) => {
      if (!stillCurrent()) return;
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      speakVerse(index + 1, run);
    };
    utteranceRef.current = utt;
    speechSynthesis.speak(utt);
  }, [verses, getVoice]);

  const play = useCallback((startIndex = 0) => {
    const run = runRef.current + 1;
    runRef.current = run;
    cancelledRef.current = true;
    speechSynthesis.cancel();
    cancelledRef.current = false;
    setIsPlaying(true);
    setTimeout(() => {
      if (run !== runRef.current) return;
      speakVerse(startIndex, run);
    }, 100);
  }, [speakVerse]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      play(0);
    }
  }, [isPlaying, stop, play]);

  useEffect(() => {
    return () => {
      runRef.current += 1;
      cancelledRef.current = true;
      speechSynthesis.cancel();
    };
  }, [verses]);

  return { isPlaying, currentVerseIndex, play, stop, toggle };
}

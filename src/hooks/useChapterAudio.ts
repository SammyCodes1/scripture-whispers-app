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

  const getVoice = useCallback(() => {
    if (!selectedVoice) return null;
    const voices = speechSynthesis.getVoices();
    return voices.find(v => v.voiceURI === selectedVoice) || null;
  }, [selectedVoice]);

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
    utt.rate = speed;
    utt.pitch = 1;

    const voice = getVoice();
    if (voice) utt.voice = voice;

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
  }, [verses, getVoice]);

  const play = useCallback((startIndex = 0) => {
    stop();
    cancelledRef.current = false;
    setIsPlaying(true);
    setTimeout(() => speakVerse(startIndex), 100);
  }, [stop, speakVerse]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      play(0);
    }
  }, [isPlaying, stop, play]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      speechSynthesis.cancel();
    };
  }, [verses]);

  return { isPlaying, currentVerseIndex, play, stop, toggle };
}

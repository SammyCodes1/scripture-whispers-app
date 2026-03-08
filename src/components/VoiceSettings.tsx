import { useState, useEffect } from 'react';
import { Volume2, Check, Play, Gauge } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { VOICE_STORAGE_KEY, SPEED_STORAGE_KEY } from '@/hooks/useChapterAudio';

interface BrowserVoice {
  name: string;
  lang: string;
  voiceURI: string;
}

export default function VoiceSettings() {
  const [voices, setVoices] = useState<BrowserVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useLocalStorage<string>(VOICE_STORAGE_KEY, '');
  const [speed, setSpeed] = useLocalStorage<number>(SPEED_STORAGE_KEY, 1);

  const SPEED_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

  useEffect(() => {
    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      const englishVoices = available
        .filter(v => v.lang.startsWith('en'))
        .map(v => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI }));
      setVoices(englishVoices);
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const previewVoice = (voiceURI: string) => {
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance('The Lord is my shepherd; I shall not want.');
    utt.rate = speed;
    const voice = speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
    if (voice) utt.voice = voice;
    speechSynthesis.speak(utt);
  };

  const speedSection = (
    <div className="mt-4">
      <h4 className="font-display text-sm font-bold text-foreground mb-2 flex items-center gap-2">
        <Gauge size={16} /> Reading Speed
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {SPEED_STEPS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              speed === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-primary/10'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Current speed: <span className="font-bold text-foreground">{speed}x</span>
      </p>
    </div>
  );

  if (voices.length === 0) {
    return (
      <section>
        <h3 className="font-display text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Volume2 size={18} /> Reading Voice
        </h3>
        <p className="text-sm text-muted-foreground">No voices available on this device.</p>
        {speedSection}
      </section>
    );
  }

  return (
    <section>
      <h3 className="font-display text-base font-bold text-foreground mb-3 flex items-center gap-2">
        <Volume2 size={18} /> Reading Voice
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Choose a voice for the chapter audio reader.
      </p>

      <div className="space-y-1.5 max-h-64 overflow-y-auto rounded-lg border border-border p-2 bg-card">
        {/* Default option */}
        <button
          onClick={() => setSelectedVoice('')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
            !selectedVoice
              ? 'bg-primary/10 border border-primary/30'
              : 'hover:bg-secondary/50'
          }`}
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-card-foreground">System Default</p>
            <p className="text-xs text-muted-foreground">Uses your device's default voice</p>
          </div>
          {!selectedVoice && <Check size={16} className="text-primary" />}
        </button>

        {voices.map((voice) => (
          <div
            key={voice.voiceURI}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${
              selectedVoice === voice.voiceURI
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-secondary/50'
            }`}
          >
            <button
              onClick={() => setSelectedVoice(voice.voiceURI)}
              className="flex-1 text-left"
            >
              <p className="text-sm font-medium text-card-foreground">{voice.name}</p>
              <p className="text-xs text-muted-foreground">{voice.lang}</p>
            </button>
            <button
              onClick={() => previewVoice(voice.voiceURI)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
              title="Preview voice"
            >
              <Play size={14} />
            </button>
            {selectedVoice === voice.voiceURI && <Check size={16} className="text-primary" />}
          </div>
        ))}
      </div>

      {/* Reading Speed */}
      <div className="mt-4">
        <h4 className="font-display text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          <Gauge size={16} /> Reading Speed
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {SPEED_STEPS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                speed === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-primary/10'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Current speed: <span className="font-bold text-foreground">{speed}x</span>
        </p>
      </div>
    </section>
  );
}

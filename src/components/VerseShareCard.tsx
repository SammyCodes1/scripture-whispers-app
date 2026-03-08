import { useState, useRef } from 'react';
import { X, Download, Share2, Image, MessageCircle, Facebook, Instagram, Copy, ExternalLink } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface VerseShareCardProps {
  reference: string;
  text: string;
  version: string;
  onClose: () => void;
}

const CARD_STYLES = [
  { id: 'golden', label: 'Golden', bg: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', text: '#3d2000', accent: '#7c4a00' },
  { id: 'ocean', label: 'Ocean', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff', accent: '#e0d4f7' },
  { id: 'forest', label: 'Forest', bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', text: '#003020', accent: '#004d35' },
  { id: 'midnight', label: 'Midnight', bg: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', text: '#e8e4f0', accent: '#a89ec9' },
  { id: 'rose', label: 'Rose', bg: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)', text: '#4a0e1a', accent: '#7a1a30' },
  { id: 'earth', label: 'Earth', bg: 'linear-gradient(135deg, #8B7355 0%, #C4A882 50%, #D4C5A9 100%)', text: '#2d1f0e', accent: '#5c4427' },
  { id: 'royal', label: 'Royal', bg: 'linear-gradient(135deg, #141E30 0%, #243B55 100%)', text: '#d4af37', accent: '#b8962e' },
  { id: 'lavender', label: 'Lavender', bg: 'linear-gradient(135deg, #E8D5F5 0%, #C3AED6 50%, #A888C4 100%)', text: '#2e1a47', accent: '#4a2d6e' },
  { id: 'flame', label: 'Flame', bg: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)', text: '#ffffff', accent: '#fff3d6' },
  { id: 'arctic', label: 'Arctic', bg: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)', text: '#1a2a4a', accent: '#3a5a8a' },
  { id: 'noir', label: 'Noir', bg: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)', text: '#e0e0e0', accent: '#888888' },
  { id: 'peach', label: 'Peach', bg: 'linear-gradient(135deg, #FCEABB 0%, #F8B500 100%)', text: '#3d2800', accent: '#6b4700' },
];

type ShareMode = 'image' | 'apps';

export default function VerseShareCard({ reference, text, version, onClose }: VerseShareCardProps) {
  const [styleIndex, setStyleIndex] = useState(0);
  const [mode, setMode] = useState<ShareMode>('image');
  const cardRef = useRef<HTMLDivElement>(null);
  const style = CARD_STYLES[styleIndex];

  const verseText = `"${text}"\n— ${reference} (${version.toUpperCase()})`;
  const encodedText = encodeURIComponent(verseText);

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reference.replace(/\s+/g, '_')}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Image downloaded!');
  };

  const handleShareImage = async () => {
    const blob = await generateImage();
    if (!blob) return;
    const file = new File([blob], `${reference}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: reference, text: `${reference} - ${text}` });
    } else {
      await navigator.clipboard.writeText(verseText);
      toast.success('Verse copied! You can paste it on social media.');
    }
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(verseText);
    toast.success('Verse copied to clipboard!');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: reference, text: verseText });
    } else {
      handleCopyText();
    }
  };

  const shareApps = [
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20',
      url: `https://wa.me/?text=${encodedText}`,
    },
    {
      name: 'Facebook',
      icon: '📘',
      color: 'bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20',
      url: `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`,
    },
    {
      name: 'X (Twitter)',
      icon: '🐦',
      color: 'bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20',
      url: `https://twitter.com/intent/tweet?text=${encodedText}`,
    },
    {
      name: 'Telegram',
      icon: '✈️',
      color: 'bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20',
      url: `https://t.me/share/url?url=&text=${encodedText}`,
    },
    {
      name: 'Email',
      icon: '📧',
      color: 'bg-muted text-foreground hover:bg-muted/80',
      url: `mailto:?subject=${encodeURIComponent(reference)}&body=${encodedText}`,
    },
    {
      name: 'SMS',
      icon: '💬',
      color: 'bg-muted text-foreground hover:bg-muted/80',
      url: `sms:?body=${encodedText}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-foreground">Share Verse</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
          <button
            onClick={() => setMode('image')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'image' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Image size={16} /> Share as Image
          </button>
          <button
            onClick={() => setMode('apps')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'apps' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ExternalLink size={16} /> Share to Apps
          </button>
        </div>

        {mode === 'image' && (
          <>
            {/* Preview card */}
            <div
              ref={cardRef}
              className="rounded-xl overflow-hidden"
              style={{
                background: style.bg,
                padding: '40px 32px',
                minHeight: 240,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <p style={{ color: style.text, fontSize: 18, lineHeight: 1.7, fontFamily: 'Georgia, serif', fontStyle: 'italic', marginBottom: 20, maxWidth: 340 }}>
                "{text}"
              </p>
              <p style={{ color: style.accent, fontSize: 14, fontWeight: 700, fontFamily: 'Georgia, serif', letterSpacing: 1 }}>
                — {reference}
              </p>
              <p style={{ color: style.accent, fontSize: 10, marginTop: 8, opacity: 0.7 }}>
                {version.toUpperCase()} • HolyWord
              </p>
            </div>

            {/* Style picker */}
            <div className="flex gap-2 justify-center flex-wrap">
              {CARD_STYLES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setStyleIndex(i)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${i === styleIndex ? 'border-primary scale-110' : 'border-transparent'}`}
                  style={{ background: s.bg }}
                  title={s.label}
                />
              ))}
            </div>

            {/* Image actions */}
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <Download size={16} /> Download
              </button>
              <button
                onClick={handleShareImage}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <Share2 size={16} /> Share Image
              </button>
            </div>
          </>
        )}

        {mode === 'apps' && (
          <>
            {/* Verse preview text */}
            <div className="rounded-lg bg-background border border-border p-3">
              <p className="text-sm italic text-foreground">"{text}"</p>
              <p className="text-xs font-bold text-primary mt-2">— {reference} ({version.toUpperCase()})</p>
            </div>

            {/* Share to apps grid */}
            <div className="grid grid-cols-3 gap-2">
              {shareApps.map(app => (
                <a
                  key={app.name}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${app.color}`}
                >
                  <span className="text-2xl">{app.icon}</span>
                  <span className="text-xs font-medium">{app.name}</span>
                </a>
              ))}
            </div>

            {/* Copy & native share */}
            <div className="flex gap-3">
              <button
                onClick={handleCopyText}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <Copy size={16} /> Copy Text
              </button>
              {'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  <Share2 size={16} /> More Apps
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


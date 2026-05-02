import { motion } from 'framer-motion';
import { Loader2, ImageOff, Landmark, Camera } from 'lucide-react';
import { useLocationImages } from '@/hooks/useLocationImages';
import type { BiblicalLocation } from '@/data/biblicalLocations';

interface Props {
  location: BiblicalLocation;
}

export default function LocationImageGallery({ location }: Props) {
  const { images, loading } = useLocationImages(location.id, location.wikiModern, location.wikiHistorical);

  const modern = images.filter(i => i.era === 'modern');
  const historical = images.filter(i => i.era === 'historical');

  if (loading && images.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
        <Loader2 className="animate-spin" size={14} />
        Loading images…
      </div>
    );
  }

  if (!loading && images.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
        <ImageOff size={14} />
        No images cached. Connect to internet to load.
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {modern.length > 0 && (
        <Section title="Modern" icon={<Camera size={12} />} items={modern} />
      )}
      {historical.length > 0 && (
        <Section title="Historical" icon={<Landmark size={12} />} items={historical} />
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { url: string; blobUrl?: string; title: string; description?: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
        {icon} {title}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((im, i) => (
          <motion.a
            key={im.url}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            href={im.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-square rounded-xl overflow-hidden bg-secondary/40 border border-border/40 group relative"
            title={im.description || im.title}
          >
            <img
              src={im.blobUrl || im.url}
              alt={im.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
              <p className="text-[9px] text-white font-medium line-clamp-1">{im.title}</p>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

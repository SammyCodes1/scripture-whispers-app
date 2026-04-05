import { useState, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Mountain, Waves, Globe2, Loader2, X, BookOpen } from 'lucide-react';
import { BIBLICAL_LOCATIONS, LOCATION_CATEGORIES, type BiblicalLocation } from '@/data/biblicalLocations';
import BibleGlobe from '@/components/BibleGlobe';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <Globe2 size={14} />,
  city: <MapPin size={14} />,
  mountain: <Mountain size={14} />,
  river: <Waves size={14} />,
  region: <Globe2 size={14} />,
  sea: <Waves size={14} />,
};

export default function BibleMaps() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState<BiblicalLocation | null>(null);

  const filteredLocations = useMemo(
    () => selectedCategory === 'all'
      ? BIBLICAL_LOCATIONS
      : BIBLICAL_LOCATIONS.filter(l => l.category === selectedCategory),
    [selectedCategory]
  );

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Bible Maps</h1>
        <p className="text-sm text-muted-foreground mt-1">Explore biblical locations on an interactive 3D globe</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {LOCATION_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.id); setSelectedLocation(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              selectedCategory === cat.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary/60 text-secondary-foreground hover:bg-secondary'
            }`}
          >
            {CATEGORY_ICONS[cat.id]}
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3D Globe */}
      <Suspense
        fallback={
          <div className="w-full h-[400px] sm:h-[500px] rounded-2xl border border-border/60 bg-secondary/20 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        }
      >
        <BibleGlobe
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
        />
      </Suspense>

      {/* Selected location detail */}
      <AnimatePresence>
        {selectedLocation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-card border border-border/60 rounded-2xl p-5 shadow-lg relative"
          >
            <button
              onClick={() => setSelectedLocation(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground transition-all"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2 rounded-xl ${
                selectedLocation.category === 'city' ? 'bg-red-500/10 text-red-500' :
                selectedLocation.category === 'mountain' ? 'bg-green-500/10 text-green-500' :
                selectedLocation.category === 'river' ? 'bg-blue-500/10 text-blue-500' :
                selectedLocation.category === 'sea' ? 'bg-cyan-500/10 text-cyan-500' :
                'bg-amber-500/10 text-amber-500'
              }`}>
                {selectedLocation.category === 'city' && <MapPin size={20} />}
                {selectedLocation.category === 'mountain' && <Mountain size={20} />}
                {(selectedLocation.category === 'river' || selectedLocation.category === 'sea') && <Waves size={20} />}
                {selectedLocation.category === 'region' && <Globe2 size={20} />}
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-card-foreground">{selectedLocation.name}</h3>
                {selectedLocation.modernName && (
                  <p className="text-xs text-muted-foreground">{selectedLocation.modernName}</p>
                )}
              </div>
            </div>

            <p className="text-sm text-card-foreground leading-relaxed mb-3">{selectedLocation.description}</p>

            <div className="bg-primary/5 rounded-xl p-3 mb-3">
              <p className="text-xs font-semibold text-primary mb-1">Significance</p>
              <p className="text-sm text-card-foreground leading-relaxed">{selectedLocation.significance}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <BookOpen size={12} /> Key Verses
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedLocation.verses.map(v => (
                  <span key={v} className="text-xs px-2.5 py-1 bg-secondary/60 text-secondary-foreground rounded-full font-medium">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location list */}
      <div>
        <h3 className="font-display text-sm font-bold text-foreground mb-3">
          {selectedCategory === 'all' ? 'All Locations' : LOCATION_CATEGORIES.find(c => c.id === selectedCategory)?.label}
          <span className="text-muted-foreground font-normal ml-2">({filteredLocations.length})</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filteredLocations.map((loc, i) => (
            <motion.button
              key={loc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedLocation(loc)}
              className={`text-left rounded-xl border p-3 transition-all ${
                selectedLocation?.id === loc.id
                  ? 'border-primary/40 bg-primary/5 shadow-sm'
                  : 'border-border/60 bg-card hover:shadow-md'
              }`}
            >
              <p className="font-display font-bold text-sm text-card-foreground">{loc.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{loc.category}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

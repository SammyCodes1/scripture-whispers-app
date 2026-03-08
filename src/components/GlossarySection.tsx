import { useState } from 'react';
import { BookA, ChevronDown, ChevronUp } from 'lucide-react';
import { GLOSSARY } from '@/data/glossaryData';

export default function GlossarySection() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? GLOSSARY : GLOSSARY.slice(0, 8);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <BookA size={18} className="text-primary" />
        <h2 className="font-display text-lg font-bold text-foreground">Glossary</h2>
      </div>
      <div className="space-y-1.5">
        {displayed.map(entry => {
          const isOpen = expanded === entry.term;
          return (
            <button
              key={entry.term}
              onClick={() => setExpanded(isOpen ? null : entry.term)}
              className="w-full text-left rounded-lg bg-card border border-border p-3 transition-all hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-card-foreground">{entry.term}</span>
                {isOpen ? (
                  <ChevronUp size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={14} className="text-muted-foreground" />
                )}
              </div>
              {isOpen && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{entry.definition}</p>
              )}
            </button>
          );
        })}
      </div>
      {GLOSSARY.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-sm text-primary hover:underline font-medium"
        >
          {showAll ? 'Show less' : `View all ${GLOSSARY.length} terms →`}
        </button>
      )}
    </div>
  );
}

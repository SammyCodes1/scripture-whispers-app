import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const THEMES = [
  { id: 'classic', name: 'Classic', emoji: '📜' },
  { id: 'glassy', name: 'Glassy', emoji: '🪟' },
  { id: 'wooden', name: 'Wooden', emoji: '🪵' },
  { id: 'lights-out', name: 'Lights Out', emoji: '🌑' },
  { id: 'nature', name: 'Nature', emoji: '🌿' },
  { id: 'glossy', name: 'Glossy', emoji: '✨' },
  { id: 'ocean', name: 'Ocean', emoji: '🌊' },
  { id: 'royal', name: 'Royal', emoji: '👑' },
  { id: 'sunset', name: 'Sunset', emoji: '🌅' },
  { id: 'marble', name: 'Marble', emoji: '🏛️' },
] as const;

// Free translations available from dailybible.ca API
export const BIBLE_VERSIONS = [
  { id: 'kjv', name: 'KJV', full: 'King James Version' },
  { id: 'asv', name: 'ASV', full: 'American Standard Version' },
  { id: 'darby', name: 'Darby', full: 'Darby Translation' },
  { id: 'dra', name: 'DRA', full: 'Douay-Rheims American' },
] as const;

type ThemeId = typeof THEMES[number]['id'];
type BibleVersionId = typeof BIBLE_VERSIONS[number]['id'];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  version: BibleVersionId;
  setVersion: (v: BibleVersionId) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

function applyTheme(themeId: string) {
  const root = document.documentElement;
  // Remove all theme classes first
  THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
  // Add the new theme class
  root.classList.add(`theme-${themeId}`);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() =>
    (localStorage.getItem('hw-theme') as ThemeId) || 'classic'
  );
  const [version, setVersionState] = useState<BibleVersionId>(() =>
    (localStorage.getItem('hw-version') as BibleVersionId) || 'kjv'
  );

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem('hw-theme', t);
    applyTheme(t);
  }, []);

  const setVersion = useCallback((v: BibleVersionId) => {
    setVersionState(v);
    localStorage.setItem('hw-version', v);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, version, setVersion }}>
      {children}
    </ThemeContext.Provider>
  );
};

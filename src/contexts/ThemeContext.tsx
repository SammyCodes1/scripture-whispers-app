import React, { createContext, useContext, useState, useEffect } from 'react';

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

export const BIBLE_VERSIONS = ['KJV', 'NLT', 'AMPC', 'NIV', 'ESV', 'NKJV', 'MSG', 'AMP'] as const;

type ThemeId = typeof THEMES[number]['id'];
type BibleVersion = typeof BIBLE_VERSIONS[number];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  version: BibleVersion;
  setVersion: (v: BibleVersion) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() =>
    (localStorage.getItem('hw-theme') as ThemeId) || 'classic'
  );
  const [version, setVersionState] = useState<BibleVersion>(() =>
    (localStorage.getItem('hw-version') as BibleVersion) || 'KJV'
  );

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem('hw-theme', t);
  };

  const setVersion = (v: BibleVersion) => {
    setVersionState(v);
    localStorage.setItem('hw-version', v);
  };

  useEffect(() => {
    document.documentElement.className = `theme-${theme}`;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, version, setVersion }}>
      {children}
    </ThemeContext.Provider>
  );
};

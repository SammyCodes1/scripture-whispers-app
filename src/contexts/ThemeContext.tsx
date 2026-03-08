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

export const BIBLE_VERSIONS = [
  { id: 'kjv', name: 'KJV', full: 'King James Version' },
  { id: 'asv', name: 'ASV', full: 'American Standard Version' },
  { id: 'darby', name: 'Darby', full: 'Darby Translation' },
  { id: 'dra', name: 'DRA', full: 'Douay-Rheims American' },
] as const;

export const FONT_SIZES = [
  { id: 'xs', name: 'Extra Small', value: '13px' },
  { id: 'sm', name: 'Small', value: '14px' },
  { id: 'md', name: 'Medium', value: '16px' },
  { id: 'lg', name: 'Large', value: '18px' },
  { id: 'xl', name: 'Extra Large', value: '20px' },
] as const;

type ThemeId = typeof THEMES[number]['id'];
type BibleVersionId = typeof BIBLE_VERSIONS[number]['id'];
type FontSizeId = typeof FONT_SIZES[number]['id'];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  version: BibleVersionId;
  setVersion: (v: BibleVersionId) => void;
  fontSize: FontSizeId;
  setFontSize: (f: FontSizeId) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

function applyTheme(themeId: string) {
  const root = document.documentElement;
  THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
  root.classList.add(`theme-${themeId}`);
}

function applyFontSize(sizeId: string) {
  const size = FONT_SIZES.find(f => f.id === sizeId);
  if (size) {
    document.documentElement.style.setProperty('--verse-font-size', size.value);
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() =>
    (localStorage.getItem('hw-theme') as ThemeId) || 'classic'
  );
  const [version, setVersionState] = useState<BibleVersionId>(() =>
    (localStorage.getItem('hw-version') as BibleVersionId) || 'kjv'
  );
  const [fontSize, setFontSizeState] = useState<FontSizeId>(() =>
    (localStorage.getItem('hw-font-size') as FontSizeId) || 'md'
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

  const setFontSize = useCallback((f: FontSizeId) => {
    setFontSizeState(f);
    localStorage.setItem('hw-font-size', f);
    applyFontSize(f);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    applyFontSize(fontSize);
  }, [theme, fontSize]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, version, setVersion, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

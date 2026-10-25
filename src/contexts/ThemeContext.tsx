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
  { id: 'ios-glass-light', name: 'iOS Glass Light', emoji: '🫧' },
  { id: 'ios-glass-dark', name: 'iOS Glass Dark', emoji: '🌌' },
] as const;

export const BIBLE_VERSIONS = [
  {
    id: 'niv',
    name: 'NIV',
    full: 'New International Version',
    licensed: true,
    notice: 'Scripture taken from the Holy Bible, NEW INTERNATIONAL VERSION®, NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission. All rights reserved worldwide.',
  },
  {
    id: 'nlt',
    name: 'NLT',
    full: 'New Living Translation',
    licensed: true,
    notice: 'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.',
  },
  {
    id: 'amp',
    name: 'AMP',
    full: 'Amplified Bible',
    licensed: true,
    notice: 'Scripture quotations taken from the Amplified® Bible, Copyright © 2015 by The Lockman Foundation. Used by permission. www.lockman.org',
  },
  { id: 'kjv', name: 'KJV', full: 'King James Version' },
  { id: 'asv', name: 'ASV', full: 'American Standard Version' },
  { id: 'darby', name: 'Darby', full: 'Darby Translation' },
  { id: 'dra', name: 'DRA', full: 'Douay-Rheims American' },
  { id: 'web', name: 'WEB', full: 'World English Bible' },
  { id: 'bbe', name: 'BBE', full: 'Bible in Basic English' },
] as const;

/** Public-domain versions that may be stored on the device. Licensed texts stay online. */
export const OFFLINE_VERSIONS = BIBLE_VERSIONS.filter(v => !('licensed' in v && v.licensed));

export const FONT_SIZES = [
  { id: 'xs', name: 'Extra Small', value: '13px' },
  { id: 'sm', name: 'Small', value: '14px' },
  { id: 'md', name: 'Medium', value: '16px' },
  { id: 'lg', name: 'Large', value: '18px' },
  { id: 'xl', name: 'Extra Large', value: '20px' },
] as const;

export const FONT_FAMILIES = [
  { id: 'serif', name: 'Serif', value: "'Lora', 'Georgia', serif", emoji: '📖' },
  { id: 'sans', name: 'Sans-serif', value: "'Inter', 'Helvetica', sans-serif", emoji: '🔤' },
  { id: 'mono', name: 'Monospace', value: "'JetBrains Mono', 'Courier New', monospace", emoji: '💻' },
] as const;

type ThemeId = typeof THEMES[number]['id'];
type BibleVersionId = typeof BIBLE_VERSIONS[number]['id'];
type FontSizeId = typeof FONT_SIZES[number]['id'];
type FontFamilyId = typeof FONT_FAMILIES[number]['id'];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  version: BibleVersionId;
  setVersion: (v: BibleVersionId) => void;
  fontSize: FontSizeId;
  setFontSize: (f: FontSizeId) => void;
  fontFamily: FontFamilyId;
  setFontFamily: (f: FontFamilyId) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

function applyTheme(themeId: string) {
  document.documentElement.setAttribute('data-theme', themeId);
}

function applyFontSize(sizeId: string) {
  const size = FONT_SIZES.find(f => f.id === sizeId);
  if (size) document.documentElement.style.setProperty('--verse-font-size', size.value);
}

function applyFontFamily(familyId: string) {
  const family = FONT_FAMILIES.find(f => f.id === familyId);
  if (family) document.documentElement.style.setProperty('--verse-font-family', family.value);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() =>
    (localStorage.getItem('hw-theme') as ThemeId) || 'classic'
  );
  const [version, setVersionState] = useState<BibleVersionId>(() => {
    const saved = localStorage.getItem('hw-version');
    const match = BIBLE_VERSIONS.find(v => v.id === saved);
    return match ? match.id : 'kjv';
  });
  const [fontSize, setFontSizeState] = useState<FontSizeId>(() =>
    (localStorage.getItem('hw-font-size') as FontSizeId) || 'md'
  );
  const [fontFamily, setFontFamilyState] = useState<FontFamilyId>(() =>
    (localStorage.getItem('hw-font-family') as FontFamilyId) || 'serif'
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

  const setFontFamily = useCallback((f: FontFamilyId) => {
    setFontFamilyState(f);
    localStorage.setItem('hw-font-family', f);
    applyFontFamily(f);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    applyFontSize(fontSize);
    applyFontFamily(fontFamily);
  }, [theme, fontSize, fontFamily]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, version, setVersion, fontSize, setFontSize, fontFamily, setFontFamily }}>
      {children}
    </ThemeContext.Provider>
  );
};

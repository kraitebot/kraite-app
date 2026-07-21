import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type Palette = {
  dark: boolean;
  canvas: string;
  canvasRaised: string;
  panel: string;
  panelStrong: string;
  line: string;
  lineStrong: string;
  text: string;
  textSoft: string;
  textFaint: string;
  green: string;
  greenSoft: string;
  greenDeep: string;
  red: string;
  redSoft: string;
  amber: string;
  amberSoft: string;
  track: string;
  nav: string;
};

const dark: Palette = {
  dark: true,
  canvas: '#07100D',
  canvasRaised: '#0B1512',
  panel: '#101C18',
  panelStrong: '#15231E',
  line: '#22342D',
  lineStrong: '#315044',
  text: '#F2F7F4',
  textSoft: '#93A69E',
  textFaint: '#5E746B',
  green: '#27E58A',
  greenSoft: '#123B2B',
  greenDeep: '#0A241B',
  red: '#FF6571',
  redSoft: '#3A1C21',
  amber: '#F4B860',
  amberSoft: '#392B16',
  track: '#293A34',
  nav: '#09120F',
};

const light: Palette = {
  dark: false,
  canvas: '#EEF3F0',
  canvasRaised: '#F6F9F7',
  panel: '#FFFFFF',
  panelStrong: '#F8FBF9',
  line: '#DCE6E1',
  lineStrong: '#BCCDC5',
  text: '#10221B',
  textSoft: '#597067',
  textFaint: '#8A9B94',
  green: '#00A861',
  greenSoft: '#DDF6E9',
  greenDeep: '#C8EEDD',
  red: '#D94350',
  redSoft: '#FBE6E8',
  amber: '#A8670B',
  amberSoft: '#FFF0D6',
  track: '#D8E2DD',
  nav: '#FFFFFF',
};

const THEME_KEY = 'kraite.theme';
type Mode = 'system' | 'dark' | 'light';
type ThemeValue = { palette: Palette; mode: Mode; toggle: () => void };
const ThemeContext = createContext<ThemeValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<Mode>('system');

  useEffect(() => {
    void SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      if (stored === 'dark' || stored === 'light' || stored === 'system') setMode(stored);
    });
  }, []);

  const effective = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  const value = useMemo<ThemeValue>(() => ({
    palette: effective === 'dark' ? dark : light,
    mode,
    toggle: () => {
      const next: Mode = effective === 'dark' ? 'light' : 'dark';
      setMode(next);
      void SecureStore.setItemAsync(THEME_KEY, next);
    },
  }), [effective, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme, type ThemeMode } from './theme';

const STORAGE_KEY = 'theme-mode';

interface ModeContext {
  mode: ThemeMode;
  toggle: () => void;
}

// Without a provider (e.g. in tests) the app simply stays light.
const Context = createContext<ModeContext>({ mode: 'light', toggle: () => {} });
export const useThemeMode = () => useContext(Context);

export default function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => (localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'));
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const toggle = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, next);
    setMode(next);
  };

  return (
    <Context.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Context.Provider>
  );
}

import { createTheme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

// Light colours were picked so text on them has at least 4.5:1 contrast (WCAG AA); the dark set keeps the same rule.
const PALETTE = {
  light: {
    primary: '#1d4ed8', // 6.7:1 on white
    error: '#b71c1c',
    background: { default: '#f4f6fa', paper: '#ffffff' },
    text: { primary: '#1a2233', secondary: '#4a5568' }, // secondary is 7.5:1 on white
    divider: '#dfe3ea',
    tableHead: '#f8f9fc',
  },
  dark: {
    primary: '#7aa2ff',
    error: '#ff8a80',
    background: { default: '#0f1420', paper: '#182030' },
    text: { primary: '#e8ecf5', secondary: '#aab4c8' },
    divider: '#2c3650',
    tableHead: '#1d2639',
  },
};

export const createAppTheme = (mode: ThemeMode) => {
  const c = PALETTE[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: c.primary },
      error: { main: c.error },
      background: c.background,
      text: c.text,
      divider: c.divider,
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      h1: { fontSize: '1.6rem', fontWeight: 700 },
      h2: { fontSize: '1.3rem', fontWeight: 700 },
      h3: { fontSize: '1.05rem', fontWeight: 600 },
      body1: { fontSize: '0.9rem' },
      body2: { fontSize: '0.8rem' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // A clear focus ring for keyboard users on everything interactive.
          'a:focus-visible, button:focus-visible, input:focus-visible, [tabindex]:focus-visible': {
            outline: `3px solid ${c.primary}`,
            outlineOffset: '2px',
          },
        },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '&.Mui-disabled, &.Mui-disabled *': { cursor: 'not-allowed' },
            '&.Mui-disabled input, &.Mui-disabled textarea, &.Mui-disabled .MuiSelect-select': { WebkitTextFillColor: c.text.secondary },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          sizeSmall: { padding: '6px 10px', fontSize: '0.8125rem' },
          head: { whiteSpace: 'nowrap', fontWeight: 600, backgroundColor: c.tableHead },
        },
      },
      MuiTablePagination: { styleOverrides: { toolbar: { minHeight: 44 } } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: `1px solid ${c.divider}`, backgroundImage: 'none' } } },
    },
  });
};

export const theme = createAppTheme('light'); // used by tests

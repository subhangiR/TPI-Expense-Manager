import { alpha, useTheme } from '@mui/material/styles';

// Slice colours for categories or departments: mid-tones that are visible on both the light and the dark theme.
export const CATEGORY_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899', '#64748b'];

export default function useChartColors() {
  const theme = useTheme();
  return {
    primary: theme.palette.primary.main,
    primarySoft: alpha(theme.palette.primary.main, 0.25),
    text: theme.palette.text.primary,
    grid: theme.palette.divider,
    cursor: alpha(theme.palette.primary.main, 0.1),
    tooltip: {
      contentStyle: { background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, color: theme.palette.text.primary },
      itemStyle: { color: theme.palette.text.primary },
    },
  };
}

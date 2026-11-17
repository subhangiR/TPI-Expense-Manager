import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import { alpha } from '@mui/material/styles';
import { statusColor, statusLabel } from './StatusChip';
import { formatDateTime } from '../utils/format';
import type { HistoryEntry } from '../types';

function headline(entry: HistoryEntry): string {
  if (entry.action === 'CREATE') return 'Created as draft';
  if (entry.action === 'UPDATE') return 'Edited';
  return `${entry.from_status ? `${statusLabel(entry.from_status)} → ` : ''}${statusLabel(entry.to_status)}`;
}

export default function HistoryTimeline({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return <Typography color="text.secondary">No activity recorded.</Typography>;

  return (
    <>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
        <ArrowUpward sx={{ fontSize: 14 }} aria-hidden="true" /> Newest first
      </Typography>
      <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {[...history].reverse().map((entry, index, list) => {
          const current = index === 0;
          return (
            <Box
              component="li"
              key={entry.id}
              sx={{ position: 'relative', pl: 3, pb: index === list.length - 1 ? 0 : 2, borderColor: 'divider', borderLeft: index === list.length - 1 ? 'none' : '2px solid', ml: '5px' }}
            >
              {/* The dot is coloured by the status the expense reached, but the text always says it too. The current one gets a soft halo. */}
              <Box
                aria-hidden="true"
                sx={{
                  position: 'absolute', left: -7, top: 4, width: 12, height: 12, borderRadius: '50%',
                  bgcolor: statusColor(entry.to_status), border: '2px solid', borderColor: 'background.paper',
                  boxShadow: current ? `0 0 0 4px ${alpha(statusColor(entry.to_status), 0.25)}` : 'none',
                }}
              />
              <Typography sx={{ fontWeight: current ? 700 : 500, lineHeight: 1.4 }}>{headline(entry)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {entry.performed_by_name} · <time dateTime={entry.created_at}>{formatDateTime(entry.created_at)}</time>
              </Typography>
              {entry.comments && (
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
                  {entry.action === 'UPDATE' || entry.action === 'CREATE' ? entry.comments : `“${entry.comments}”`}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </>
  );
}

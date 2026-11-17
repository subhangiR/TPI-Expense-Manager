import Chip from '@mui/material/Chip';
import type { ExpenseStatus } from '../types';

// Colour is never the only signal: every chip also shows the status as text.
// Each background/text pair has at least 4.5:1 contrast.
const STATUS_STYLES: Record<ExpenseStatus, { label: string; background: string; color: string }> = {
  DRAFT: { label: 'Draft', background: '#eceff1', color: '#37474f' },
  SUBMITTED: { label: 'Submitted', background: '#e3f2fd', color: '#0d47a1' },
  PROCESSING: { label: 'Processing', background: '#ede7f6', color: '#4527a0' },
  APPROVAL_REQUIRED: { label: 'Approval required', background: '#fff3e0', color: '#8a4500' },
  APPROVED: { label: 'Approved', background: '#e8f5e9', color: '#1b5e20' },
  COMPLETED: { label: 'Completed', background: '#e8f5e9', color: '#1b5e20' },
  REJECTED: { label: 'Rejected', background: '#ffebee', color: '#b71c1c' },
  FAILED: { label: 'Failed', background: '#ffebee', color: '#b71c1c' },
};

export const statusLabel = (status: ExpenseStatus) => STATUS_STYLES[status].label;
// Mid-tone colours that stay visible on both the light and the dark theme (chart slices, timeline dots).
const CHART_COLORS: Record<ExpenseStatus, string> = {
  DRAFT: '#78909c', SUBMITTED: '#1e88e5', PROCESSING: '#7e57c2', APPROVAL_REQUIRED: '#fb8c00',
  APPROVED: '#66bb6a', COMPLETED: '#2e7d32', REJECTED: '#e53935', FAILED: '#b71c1c',
};
export const statusColor = (status: ExpenseStatus) => CHART_COLORS[status];
export const STATUS_ORDER =Object.keys(STATUS_STYLES) as ExpenseStatus[];

export default function StatusChip({ status }: { status: ExpenseStatus }) {
  const { label, background, color } = STATUS_STYLES[status];
  return <Chip label={label} size="small" sx={{ bgcolor: background, color, fontWeight: 600 }} />;
}

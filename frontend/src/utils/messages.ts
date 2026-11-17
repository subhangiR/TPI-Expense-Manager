import type { ExpenseStatus, Role } from '../types';

const quote = (title: string) => `“${title}”`;

export function submitMessage(title: string, status: ExpenseStatus): string {
  if (status === 'COMPLETED') return `${quote(title)} was submitted and approved automatically.`;
  if (status === 'APPROVAL_REQUIRED') return `${quote(title)} was submitted and is now waiting for admin approval.`;
  if (status === 'FAILED') return `${quote(title)} was submitted, but processing failed. Please contact your administrator.`;
  return `${quote(title)} was submitted.`;
}

export const createdMessage = 'Your expense was saved as a draft. Submit it when you are ready.';

export const approvedMessage = (title: string) => `${quote(title)} was approved and completed.`;
export const rejectedMessage = (title: string) => `${quote(title)} was rejected. The employee can see your comment.`;
export const deletedMessage = (title: string) => `${quote(title)} was deleted.`;
export const updatedMessage = 'Your changes were saved.';

export function eventMessage(role: Role | undefined, title: string, status: ExpenseStatus): string {
  if (role === 'admin') {
    if (status === 'APPROVAL_REQUIRED') return `${quote(title)} needs your approval.`;
    if (status === 'COMPLETED') return `${quote(title)} was completed.`;
    if (status === 'REJECTED') return `${quote(title)} was rejected.`;
    if (status === 'FAILED') return `${quote(title)} failed during processing.`;
    return `${quote(title)} was updated.`;
  }
  if (status === 'APPROVAL_REQUIRED') return `Your expense ${quote(title)} is waiting for admin approval.`;
  if (status === 'COMPLETED') return `Your expense ${quote(title)} was approved and completed.`;
  if (status === 'REJECTED') return `Your expense ${quote(title)} was rejected. Open it to read the reason.`;
  if (status === 'FAILED') return `Your expense ${quote(title)} failed during processing. Please contact your administrator.`;
  return `Your expense ${quote(title)} was updated.`;
}

export function statusNote(role: Role | undefined, status: ExpenseStatus): { severity: 'info' | 'success' | 'warning' | 'error'; text: string } | null {
  const admin = role === 'admin';
  switch (status) {
    case 'DRAFT':
      return { severity: 'info', text: 'This is a draft. Submit it to start the approval process.' };
    case 'APPROVAL_REQUIRED':
      return admin
        ? { severity: 'warning', text: 'This expense is waiting for your decision.' }
        : { severity: 'warning', text: 'Waiting for admin approval. You will be notified once a decision is made.' };
    case 'COMPLETED':
      return { severity: 'success', text: 'This expense has been approved and completed.' };
    case 'REJECTED':
      return { severity: 'error', text: 'Rejected: an admin reviewed this expense and decided not to approve it. The reason is in the activity timeline.' };
    case 'FAILED':
      return { severity: 'error', text: admin ? 'Failed: automatic processing hit an error after submission, so no approval decision was made.' : 'Failed: automatic processing hit an error after you submitted this expense, so no approval decision was made. Please contact your administrator.' };
    default:
      return null; // SUBMITTED / PROCESSING / APPROVED pass in a moment
  }
}

export interface AttentionNote {
  status: ExpenseStatus;
  severity: 'info' | 'error';
  text: string;
  action: string;
  onDismiss?: () => void;
}

export function attentionNotes(counts: { draft: number; rejected: number; failed: number }, inPeriod: boolean): AttentionNote[] {
  const when = inPeriod ? ' in this period' : '';
  const notes: AttentionNote[] = [];
  if (counts.draft > 0) {
    notes.push({
      status: 'DRAFT',
      severity: 'info',
      text: `You have ${counts.draft} draft ${counts.draft === 1 ? 'expense' : 'expenses'}${when} that ${counts.draft === 1 ? 'has' : 'have'} not been submitted yet. Submit ${counts.draft === 1 ? 'it' : 'them'} to start approval.`,
      action: 'Review drafts',
    });
  }
  if (counts.rejected > 0) {
    notes.push({
      status: 'REJECTED',
      severity: 'error',
      text: `${counts.rejected} ${counts.rejected === 1 ? 'expense was' : 'expenses were'} rejected${when}. Open ${counts.rejected === 1 ? 'it' : 'them'} to read the admin's reason.`,
      action: 'View rejected',
    });
  }
  if (counts.failed > 0) {
    notes.push({
      status: 'FAILED',
      severity: 'error',
      text: `${counts.failed} ${counts.failed === 1 ? 'expense' : 'expenses'} failed during processing${when}. Please contact your administrator.`,
      action: 'View failed',
    });
  }
  return notes;
}

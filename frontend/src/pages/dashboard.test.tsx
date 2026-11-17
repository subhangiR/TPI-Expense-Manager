import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from './DashboardPage';
import * as expensesApi from '../api/expenses';
import { adminUser, loggedIn, normalUser, renderWithProviders } from '../testUtils';
import type { Expense } from '../types';

jest.mock('../api/expenses');
const api = expensesApi as jest.Mocked<typeof expensesApi>;

const stat = (status: string, count: number, amount = 0) => ({ status, count, amount });
const stats = {
  total_count: 6, total_amount: 20000,
  by_status: [stat('DRAFT', 2), stat('SUBMITTED', 0), stat('PROCESSING', 0), stat('APPROVAL_REQUIRED', 1, 12500), stat('APPROVED', 0), stat('COMPLETED', 1), stat('REJECTED', 1), stat('FAILED', 1)],
  by_category: [{ name: 'Travel', amount: 12500, count: 1 }],
  by_department: [{ name: 'Sales', amount: 12500, count: 1 }],
  period_unit: 'month' as const,
  by_period: [{ period: '2026-11', amount: 12500, count: 1 }],
};
const waiting = {
  id: 1, title: 'Client Meeting Travel', category: 'Travel', amount: 12500, status: 'APPROVAL_REQUIRED', updated_at: '2026-11-10T10:45:00Z',
} as Expense;

const rejected = { id: 5, title: 'Cloud Software Licence', status: 'REJECTED' } as Expense;
const failed = { id: 9, title: 'Payment Gateway Fee', status: 'FAILED' } as Expense;
const byStatus: Record<string, Expense[]> = { APPROVAL_REQUIRED: [waiting], REJECTED: [rejected], FAILED: [failed] };

beforeEach(() => {
  jest.resetAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  api.getExpenseStats.mockResolvedValue(stats as never);
  api.listExpenses.mockImplementation(async (params) => {
    const expenses = byStatus[params.status ?? ''] ?? [];
    return { expenses, pagination: { page: 1, pageSize: 100, total: expenses.length, totalPages: 1 } };
  });
});

const renderDashboard = (user: typeof normalUser) =>
  renderWithProviders(<DashboardPage />, '/dashboard', loggedIn(user));

describe('dashboard for a regular user', () => {
  it('tells them about drafts, rejections and failures, with a link to each', async () => {
    renderDashboard(normalUser);
    expect(await screen.findByText(/2 draft expenses that have not been submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/1 expense was rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/1 expense failed during processing/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review drafts/i })).toHaveAttribute('href', '/expenses?status=DRAFT');
    expect(screen.getByRole('link', { name: /view rejected/i })).toHaveAttribute('href', '/expenses?status=REJECTED');
  });

  it('hides a rejected or failed notice once the user marks it as read, and keeps it hidden after a reload', async () => {
    const view = renderDashboard(normalUser);
    await screen.findByText(/1 expense was rejected/i);
    const [markRejected] = screen.getAllByRole('button', { name: 'Mark as read' });
    await userEvent.click(markRejected);
    await waitFor(() => expect(screen.queryByText(/1 expense was rejected/i)).not.toBeInTheDocument());
    expect(screen.getByText(/1 expense failed during processing/i)).toBeInTheDocument(); // only that notice was read

    view.unmount();
    renderDashboard(normalUser);
    await screen.findByText(/1 expense failed during processing/i);
    expect(screen.queryByText(/1 expense was rejected/i)).not.toBeInTheDocument();
  });

  it('shows the amount, category and submission time on the Awaiting approval card', async () => {
    renderDashboard(normalUser);
    const card = await screen.findByRole('link', { name: /^Awaiting approval/ });
    await waitFor(() => expect(card).toHaveTextContent('₹12,500.00 · Travel'));
    expect(card).toHaveTextContent('Submitted');
    expect(card).toHaveTextContent('Nov 2026');
  });
});

describe('dashboard for an admin', () => {
  it('puts Awaiting approval first, and shows neither the drafts alert nor the user summary', async () => {
    renderDashboard(adminUser);
    const cards = await screen.findAllByRole('link', { name: /show these expenses/i });
    expect(cards[0]).toHaveAccessibleName(/^Awaiting approval/);
    expect(screen.queryByText(/draft expense/i)).not.toBeInTheDocument();
    expect(api.listExpenses).not.toHaveBeenCalled(); // the user-only notices and card preview are not fetched for an admin
  });
});

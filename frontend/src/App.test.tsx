import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import App from './App';
import * as authApi from './api/auth';
import * as expensesApi from './api/expenses';
import { adminUser, loggedIn, normalUser, renderWithProviders } from './testUtils';

jest.mock('./api/auth');
jest.mock('./api/expenses');
jest.mock('recharts', () => ({}));

const login = authApi.login as jest.Mock;

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  (expensesApi.getExpenseStats as jest.Mock).mockResolvedValue({ total_count: 0, total_amount: 0, by_status: [] });
});

const fillAndSubmit = async (email: string, password: string) => {
  if (email) await userEvent.type(screen.getByLabelText(/email/i), email);
  if (password) await userEvent.type(screen.getByLabelText(/^password/i), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('login', () => {
  it('validates required fields without calling the API', async () => {
    renderWithProviders(<App />, '/login');
    await fillAndSubmit('', '');
    expect(await screen.findByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the API error for wrong credentials', async () => {
    login.mockRejectedValue(new AxiosError('x', '401', undefined, undefined, { status: 401, statusText: '', headers: {}, config: {} as never, data: { success: false, message: 'Invalid email or password' } }));
    renderWithProviders(<App />, '/login');
    await fillAndSubmit('alice@tpi.com', 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('logs in, stores the token and opens the dashboard', async () => {
    login.mockResolvedValue({ token: 'abc', user: adminUser });
    renderWithProviders(<App />, '/login');
    await fillAndSubmit('alice@tpi.com', 'Admin@123');
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument(); // the name now lives only in the header
    expect(localStorage.getItem('expense_token')).toBe('abc');
  });
});

describe('protected routes', () => {
  it('redirects a logged-out visitor to login', () => {
    renderWithProviders(<App />, '/expenses');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('blocks a normal user from the admin page', () => {
    renderWithProviders(<App />, '/approvals', loggedIn(normalUser));
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });

  it('shows the Approvals link only to admins', () => {
    const { unmount } = renderWithProviders(<App />, '/dashboard', loggedIn(normalUser));
    expect(screen.queryByRole('link', { name: 'Approvals' })).not.toBeInTheDocument();
    unmount();
    renderWithProviders(<App />, '/dashboard', loggedIn(adminUser));
    expect(screen.getAllByRole('link', { name: 'Approvals' }).length).toBeGreaterThan(0);
  });
});

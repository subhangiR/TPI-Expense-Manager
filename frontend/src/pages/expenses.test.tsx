import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import ExpenseFormDialog from '../components/ExpenseFormDialog';
import ExpensesPage from './ExpensesPage';
import ApprovalsPage from './ApprovalsPage';
import ReviewButtons from '../components/ReviewButtons';
import * as expensesApi from '../api/expenses';
import * as lookups from '../api/lookups';
import { adminUser, loggedIn, normalUser, renderWithProviders } from '../testUtils';
import type { Expense } from '../types';

jest.mock('../api/expenses');
jest.mock('../api/lookups');

const api = expensesApi as jest.Mocked<typeof expensesApi>;

const expense: Expense = {
  id: 7, display_id: '007', title: 'Client Dinner', employee_id: 2, employee_name: 'Bob Brown', department_id: 1, department: 'Sales',
  category_id: 2, category: 'Meals', amount: 4800, expense_date: '2026-11-03', description: null, priority: 'medium',
  status: 'APPROVAL_REQUIRED', created_by: 2, created_by_name: 'Bob Brown', created_at: '2026-11-03T10:00:00Z', updated_at: '2026-11-03T10:00:00Z',
};

beforeEach(() => {
  jest.resetAllMocks();
  (lookups.getDepartments as jest.Mock).mockResolvedValue([{ id: 1, name: 'Sales' }]);
  (lookups.getCategories as jest.Mock).mockResolvedValue([{ id: 2, name: 'Meals' }]);
});

describe('create expense form', () => {
  it('closes with the X button and with the Escape key', async () => {
    const onClose = jest.fn();
    renderWithProviders(<ExpenseFormDialog onClose={onClose} onSaved={jest.fn()} />, '/expenses/new', loggedIn(normalUser));
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps Save as draft and Submit disabled until the required fields are valid', async () => {
    renderWithProviders(<ExpenseFormDialog onClose={jest.fn()} onSaved={jest.fn()} />, '/expenses/new', loggedIn(normalUser));
    const draft = await screen.findByRole('button', { name: 'Save as draft' });
    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(draft).toBeDisabled();
    expect(submit).toBeDisabled();
    expect(await screen.findByText('Fill in the required fields to continue.')).toBeInTheDocument();
    expect(screen.queryByText('Select a department')).not.toBeInTheDocument(); // department is already filled in

    await userEvent.type(screen.getByLabelText(/^title/i), 'Airport Taxi');
    await userEvent.click(screen.getByRole('combobox', { name: /category/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Meals' }));
    expect(draft).toBeDisabled(); // still no amount
    await userEvent.type(screen.getByLabelText(/amount/i), '950');
    await waitFor(() => expect(draft).toBeEnabled());
    expect(submit).toBeEnabled();
    expect(screen.queryByText('Fill in the required fields to continue.')).not.toBeInTheDocument();
    expect(api.createExpense).not.toHaveBeenCalled();
  });

  it('shows the field message when a required field is left empty', async () => {
    renderWithProviders(<ExpenseFormDialog onClose={jest.fn()} onSaved={jest.fn()} />, '/expenses/new', loggedIn(normalUser));
    await userEvent.click(await screen.findByLabelText(/^title/i));
    await userEvent.tab();
    expect(await screen.findByText('Enter a title')).toBeInTheDocument();
  });

  it('rejects an amount of zero', async () => {
    renderWithProviders(<ExpenseFormDialog onClose={jest.fn()} onSaved={jest.fn()} />, '/expenses/new', loggedIn(normalUser));
    await userEvent.type(await screen.findByLabelText(/amount/i), '0');
    expect(await screen.findByText('Amount must be greater than zero')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeDisabled();
  });
});

describe('new expense: Save as draft or Submit', () => {
  const fillForm = async () => {
    await userEvent.type(await screen.findByLabelText(/^title/i), 'Airport Taxi');
    await userEvent.click(screen.getByRole('combobox', { name: /category/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Meals' }));
    await userEvent.type(screen.getByLabelText(/amount/i), '950');
  };
  const open = (onSaved = jest.fn()) => {
    renderWithProviders(<ExpenseFormDialog onClose={jest.fn()} onSaved={onSaved} />, '/expenses/new', loggedIn(normalUser));
    return onSaved;
  };

  it('offers Cancel, Save as draft and Submit', async () => {
    open();
    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('Save as draft only creates the expense', async () => {
    api.createExpense.mockResolvedValue({ ...expense, id: 20, status: 'DRAFT' });
    const onSaved = open();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() => expect(api.createExpense).toHaveBeenCalled());
    expect(api.submitExpense).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/saved as a draft/i));
  });

  it('Submit creates the expense and sends it for approval straight away', async () => {
    api.createExpense.mockResolvedValue({ ...expense, id: 20, title: 'Airport Taxi', status: 'DRAFT' });
    api.submitExpense.mockResolvedValue({ ...expense, id: 20, title: 'Airport Taxi', status: 'COMPLETED' });
    const onSaved = open();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(api.submitExpense).toHaveBeenCalledWith(20));
    expect(onSaved).toHaveBeenCalledWith('“Airport Taxi” was submitted and approved automatically.');
  });

  it('keeps the draft and says so when the submit step fails', async () => {
    api.createExpense.mockResolvedValue({ ...expense, id: 20, title: 'Airport Taxi', status: 'DRAFT' });
    api.submitExpense.mockRejectedValue(new Error('x'));
    const onSaved = open();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/^Error: .*saved as a draft, but could not be submitted/)));
  });
});

describe('expense list', () => {
  const page = { expenses: [expense], pagination: { page: 1, pageSize: 10, total: 25, totalPages: 3 } };

  it('shows rows, then filters by status and pages through results', async () => {
    api.listExpenses.mockResolvedValue(page);
    renderWithProviders(<ExpensesPage />, '/expenses', loggedIn(normalUser));
    expect(await screen.findByText('Client Dinner')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Completed' }));
    await waitFor(() => expect(api.listExpenses).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'COMPLETED', page: 1 })));

    await userEvent.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => expect(api.listExpenses).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  it('starts filtered when a dashboard card links here with a status or spend filter', async () => {
    api.listExpenses.mockResolvedValue(page);
    renderWithProviders(<ExpensesPage />, '/expenses?status=APPROVAL_REQUIRED', loggedIn(normalUser));
    await waitFor(() => expect(api.listExpenses).toHaveBeenCalledWith(expect.objectContaining({ status: 'APPROVAL_REQUIRED' })));
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Approval required');
  });

  it('lets a regular user filter by category instead of department, and hides the department column', async () => {
    api.listExpenses.mockResolvedValue(page);
    renderWithProviders(<ExpensesPage />, '/expenses', loggedIn(normalUser));
    await screen.findByText('Client Dinner');
    expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Department' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /department/i })).not.toBeInTheDocument();
  });

  it('puts category before status for a user, and clears every filter with one button', async () => {
    api.listExpenses.mockResolvedValue(page);
    renderWithProviders(<ExpensesPage />, '/expenses?status=COMPLETED&dateFrom=2026-11-01&dateTo=2026-11-10', loggedIn(normalUser));
    await screen.findByText('Client Dinner');
    expect(screen.getAllByRole('combobox')[0]).toHaveAccessibleName('Category');
    expect(screen.getAllByRole('combobox')[1]).toHaveAccessibleName('Status');
    expect(api.listExpenses).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'COMPLETED', dateFrom: '2026-11-01', dateTo: '2026-11-10' }));

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(api.listExpenses).toHaveBeenLastCalledWith(expect.not.objectContaining({ status: 'COMPLETED' })));
    expect(api.listExpenses).toHaveBeenLastCalledWith(expect.not.objectContaining({ dateFrom: '2026-11-01' }));
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    api.listExpenses.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(page);
    renderWithProviders(<ExpensesPage />, '/expenses', loggedIn(normalUser));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Client Dinner')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    api.listExpenses.mockResolvedValue({ ...page, expenses: [], pagination: { ...page.pagination, total: 0 } });
    renderWithProviders(<ExpensesPage />, '/expenses', loggedIn(normalUser));
    expect(await screen.findByText('You have not created any expenses yet')).toBeInTheDocument();
  });
});

describe('approve / reject', () => {
  it('approves with one click', async () => {
    api.approveExpense.mockResolvedValue(expense);
    const onDone = jest.fn();
    renderWithProviders(<ReviewButtons expense={expense} onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: /approve expense 007/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('“Client Dinner” was approved and completed.'));
  });

  it('requires a comment to reject, then rejects', async () => {
    api.rejectExpense.mockResolvedValue(expense);
    const onDone = jest.fn();
    renderWithProviders(<ReviewButtons expense={expense} onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: /reject expense 007/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Reject expense' }));
    expect(await screen.findByText('Please enter a reason for rejecting this expense.')).toBeInTheDocument();
    expect(api.rejectExpense).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/reason for rejection/i), 'Missing receipt');
    await userEvent.click(screen.getByRole('button', { name: 'Reject expense' }));
    await waitFor(() => expect(api.rejectExpense).toHaveBeenCalledWith(7, 'Missing receipt'));
  });
});

describe('list actions and modal forms', () => {
  const draft: Expense = { ...expense, id: 8, title: 'Taxi Fare', status: 'DRAFT', description: 'Airport taxi' };
  const page = { expenses: [draft, expense], pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 } };
  const renderList = (route: string, user = normalUser) =>
    renderWithProviders(
      <Routes>
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<ExpensesPage />} />
        <Route path="/expenses/:id/edit" element={<ExpensesPage />} />
        <Route path="/expenses/:id/view" element={<ExpensesPage />} />
      </Routes>,
      route,
      loggedIn(user)
    );

  beforeEach(() => api.listExpenses.mockResolvedValue(page));

  it('gives an admin a read-only list: no New expense button and no edit, submit or delete', async () => {
    renderList('/expenses', adminUser);
    expect(await screen.findByRole('link', { name: 'View Taxi Fare' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /new expense/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^edit /i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(delete|submit) /i })).not.toBeInTheDocument();
  });

  it('does not offer the Draft status filter to an admin', async () => {
    renderList('/expenses', adminUser);
    await screen.findByRole('link', { name: 'View Taxi Fare' });
    await userEvent.click(screen.getByRole('combobox', { name: /status/i }));
    expect(await screen.findByRole('option', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Draft' })).not.toBeInTheDocument();
  });

  it('enables edit and delete only on drafts', async () => {
    renderList('/expenses');
    expect(await screen.findByRole('link', { name: 'Edit Taxi Fare' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete Taxi Fare' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete Client Dinner' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'View Client Dinner' })).toBeInTheDocument();
  });

  it('submits a draft from its row and says what happens next', async () => {
    api.submitExpense.mockResolvedValue({ ...expense, status: 'APPROVAL_REQUIRED' });
    renderList('/expenses');
    expect(await screen.findByRole('button', { name: 'Submit Client Dinner' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Submit Taxi Fare' }));
    await waitFor(() => expect(api.submitExpense).toHaveBeenCalledWith(8));
    expect(await screen.findByText(/waiting for admin approval/i)).toBeInTheDocument();
  });

  it('asks for confirmation before deleting a draft', async () => {
    api.deleteExpense.mockResolvedValue();
    renderList('/expenses');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Taxi Fare' }));
    expect(api.deleteExpense).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.deleteExpense).toHaveBeenCalledWith(8));
  });

  it('edits a draft in a modal and saves the change', async () => {
    api.getExpense.mockResolvedValue(draft);
    api.updateExpense.mockResolvedValue(draft);
    renderList('/expenses/8/edit');
    const title = await screen.findByLabelText(/^title/i);
    await waitFor(() => expect(title).toHaveValue('Taxi Fare'));
    await userEvent.clear(title);
    await userEvent.type(title, 'Airport Taxi');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.updateExpense).toHaveBeenCalledWith(8, expect.objectContaining({ title: 'Airport Taxi', amount: 4800 })));
    expect(await screen.findByText('Your changes were saved.')).toBeInTheDocument();
  });

  it('shows an expense in a modal as details beside a timeline, with no form fields', async () => {
    api.getExpense.mockResolvedValue(expense);
    api.getHistory.mockResolvedValue([
      { id: 1, expense_id: 7, from_status: null, to_status: 'DRAFT', action: 'CREATE', comments: null, performed_by: 2, performed_by_name: 'Bob Brown', created_at: '2026-11-03T10:00:00Z' },
      { id: 2, expense_id: 7, from_status: 'DRAFT', to_status: 'DRAFT', action: 'UPDATE', comments: 'Amount: 4000 → 4800', performed_by: 2, performed_by_name: 'Bob Brown', created_at: '2026-11-03T11:00:00Z' },
    ]);
    renderList('/expenses/7/view');
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Meals')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Client Dinner');
    expect(screen.getByRole('region', { name: 'Details' })).toHaveTextContent('Amount');
    expect(screen.getByRole('region', { name: 'Activity timeline' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(2);
    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Edited');
    expect(items[0]).toHaveTextContent('Amount: 4000 → 4800');
    expect(items[1]).toHaveTextContent('Created as draft');
  });

  it('starts a new expense with the logged-in user department but no title or category', async () => {
    renderList('/expenses/new');
    await screen.findByRole('dialog');
    await waitFor(() => expect(screen.getByLabelText(/^title/i)).toHaveValue(''));
    expect(screen.getByRole('combobox', { name: /department/i })).toHaveTextContent('Sales');
    expect(screen.getByRole('combobox', { name: /category/i })).not.toHaveTextContent('Meals');
  });
});

describe('approvals page', () => {
  it('opens an expense in a modal instead of a new page, and closes it again', async () => {
    api.listExpenses.mockResolvedValue({ expenses: [expense], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } });
    api.getExpense.mockResolvedValue(expense);
    api.getHistory.mockResolvedValue([]);
    renderWithProviders(<ApprovalsPage />, '/approvals', loggedIn(adminUser));
    await userEvent.click(await screen.findByRole('button', { name: /view expense 007/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

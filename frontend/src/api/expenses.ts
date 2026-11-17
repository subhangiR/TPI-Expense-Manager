import client from './client';
import type { ApiResponse, Expense, ExpenseStatus, HistoryEntry, Pagination } from '../types';

export interface StatusStat {
  status: ExpenseStatus;
  count: number;
  amount: number;
}

export interface ExpenseStats {
  total_count: number;
  total_amount: number;
  by_status: StatusStat[];
  by_category: { name: string; amount: number; count: number }[];
  by_department: { name: string; amount: number; count: number }[];
  period_unit: 'day' | 'month';
  by_period: { period: string; amount: number; count: number }[];
}

export async function getExpenseStats(range: { dateFrom?: string; dateTo?: string } = {}): Promise<ExpenseStats> {
  const response = await client.get<ApiResponse<ExpenseStats>>('/expenses/stats', { params: range });
  return response.data.data;
}

export interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  department?: string;
  category?: string;
  spend?: string; // 'true' = only expenses that count as spend (not draft, rejected or failed)
  dateFrom?: string;
  dateTo?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export async function listExpenses(params: ListParams) {
  // Empty filters are removed so the backend doesn't see "status=".
  const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined));
  const response = await client.get<ApiResponse<{ expenses: Expense[]; pagination: Pagination }>>('/expenses', { params: clean });
  return response.data.data;
}

export interface ExpenseInput {
  title: string;
  department_id: number;
  category_id: number;
  amount: number;
  expense_date: string;
  description: string;
  priority: string;
}

type One = ApiResponse<{ expense: Expense }>;
export const getExpense = async (id: number) => (await client.get<One>(`/expenses/${id}`)).data.data.expense;
export const createExpense = async (body: ExpenseInput) => (await client.post<One>('/expenses', body)).data.data.expense;
export const updateExpense = async (id: number, body: ExpenseInput) => (await client.patch<One>(`/expenses/${id}`, body)).data.data.expense;
export const deleteExpense = async (id: number) => { await client.delete(`/expenses/${id}`); };
export const submitExpense = async (id: number) => (await client.post<One>(`/expenses/${id}/submit`)).data.data.expense;
export const approveExpense = async (id: number) => (await client.post<One>(`/expenses/${id}/approve`)).data.data.expense;
export const rejectExpense = async (id: number, comment: string) => (await client.post<One>(`/expenses/${id}/reject`, { comment })).data.data.expense;
export const getHistory = async (id: number) => (await client.get<ApiResponse<{ history: HistoryEntry[] }>>(`/expenses/${id}/history`)).data.data.history;

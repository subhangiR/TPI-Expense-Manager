
export type Role = 'user' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'inactive';
  department_id: number | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'APPROVAL_REQUIRED'
  | 'APPROVED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED';

export type Priority = 'low' | 'medium' | 'high';

export interface Expense {
  id: number;
  display_id: string; // the id padded to 3 digits ("007"): what people see and search for
  title: string;
  employee_id: number;
  employee_name: string;
  department_id: number;
  department: string;
  category_id: number;
  category: string;
  amount: number;
  expense_date: string; // "YYYY-MM-DD"
  description: string | null;
  priority: Priority;
  status: ExpenseStatus;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface HistoryEntry {
  id: number;
  expense_id: number;
  from_status: ExpenseStatus | null;
  to_status: ExpenseStatus;
  action: string;
  comments: string | null;
  performed_by: number;
  performed_by_name: string;
  created_at: string;
}

export interface LookupItem {
  id: number;
  name: string;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useMatch, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { deleteExpense, listExpenses, submitExpense, type ListParams } from '../api/expenses';
import { getCategories, getDepartments } from '../api/lookups';
import { getErrorMessage } from '../api/client';
import { useAppSelector } from '../store/hooks';
import ConfirmDialog from '../components/ConfirmDialog';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseDetailsDialog from '../components/ExpenseDetailsDialog';
import ExpenseFormDialog from '../components/ExpenseFormDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import Notice from '../components/Notice';
import PageHeader from '../components/PageHeader';
import StatusChip, { STATUS_ORDER, statusLabel } from '../components/StatusChip';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useExpenseEvents from '../hooks/useExpenseEvents';
import { Icons } from '../components/icons';
import { deletedMessage, submitMessage } from '../utils/messages';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import type { Expense, LookupItem, Pagination } from '../types';

const COLUMNS = [
  { sortKey: 'title', label: 'Title' },
  { sortKey: 'employee_name', label: 'Employee' },
  { sortKey: 'department', label: 'Department' },
  { sortKey: 'category', label: 'Category' },
  { sortKey: 'amount', label: 'Amount', numeric: true },
  { sortKey: 'status', label: 'Status' },
  { sortKey: 'expense_date', label: 'Expense date' },
  { sortKey: 'created_at', label: 'Created' },
];

const asDate = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);

const DESC_FIRST = ['created_at', 'expense_date', 'amount'];

const FIRST_PAGE: ListParams = { page: 1, pageSize: 10, sortBy: 'created_at', sortOrder: 'desc' };

export default function ExpensesPage() {
  useDocumentTitle('Expenses');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const creating = !!useMatch('/expenses/new');
  const viewing = !!useMatch('/expenses/:id/view');
  const isAdmin = useAppSelector((state) => state.auth.user?.role) === 'admin';
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const location = useLocation();
  const [message, setMessage] = useState<string>(location.state?.message ?? ''); // set when we arrive after deleting from the details page
  // Dashboard cards link here with a filter, e.g. /expenses?status=COMPLETED, so start from the URL.
  const [searchParams] = useSearchParams();
  const [params, setParams] = useState<ListParams>(() => ({
    ...FIRST_PAGE,
    status: STATUS_ORDER.find((s) => s === searchParams.get('status')),
    spend: searchParams.get('spend') === 'true' ? 'true' : undefined,
    dateFrom: asDate(searchParams.get('dateFrom')),
    dateTo: asDate(searchParams.get('dateTo')),
  }));
  const [searchText, setSearchText] = useState('');
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listExpenses(params);
      setExpenses(data.expenses);
      setPagination(data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);
  useExpenseEvents(load);

  useEffect(() => {
    getDepartments().then(setDepartments).catch(() => setDepartments([]));
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    // Return the same object when search is unchanged, so React skips the re-render and no extra fetch happens.
    const timer = setTimeout(() => setParams((p) => ((p.search ?? '') === searchText ? p : { ...p, search: searchText, page: 1 })), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const setFilter = (name: keyof ListParams, value: string) => setParams((p) => ({ ...p, [name]: value, page: 1 }));

  // Clicking a new column sorts ascending, except dates and amounts which start with the latest/highest.
  const sortBy = (key: string) =>
    setParams((p) => {
      const firstOrder = DESC_FIRST.includes(key) ? 'desc' : 'asc';
      const flipped = p.sortOrder === 'asc' ? 'desc' : 'asc';
      return { ...p, sortBy: key, sortOrder: p.sortBy === key ? flipped : firstOrder, page: 1 };
    });

  const resetFilters = () => {
    setSearchText('');
    setParams(FIRST_PAGE);
    navigate('/expenses', { replace: true }); // also drops any filter that came in through the link
  };

  const submit = async (expense: Expense) => {
    try {
      const submitted = await submitExpense(expense.id);
      setMessage(submitMessage(submitted.title, submitted.status));
    } catch (err) {
      setMessage(`Error: ${getErrorMessage(err)}`);
    }
    load();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteExpense(toDelete.id);
      setMessage(deletedMessage(toDelete.title));
      load();
    } catch (err) {
      setMessage(`Error: ${getErrorMessage(err)}`);
    } finally {
      setToDelete(null);
    }
  };

  // Employees only see their own expenses (and have one department), so those columns would only repeat the same values.
  const columns = COLUMNS.filter((col) => isAdmin || (col.sortKey !== 'employee_name' && col.sortKey !== 'department'));

  const hasFilters = !!(params.search || params.status || params.spend || params.department || params.category || params.dateFrom || params.dateTo);

  const filterCount = [params.status, params.department, params.category, params.dateFrom, params.dateTo].filter(Boolean).length; // everything except search
  const statusField = (
    <TextField select label="Status" value={params.status ?? ''} onChange={(e) => setFilter('status', e.target.value)}>
      <MenuItem value="">All statuses</MenuItem>
      {STATUS_ORDER.filter((s) => !isAdmin || s !== 'DRAFT').map((s) => <MenuItem key={s} value={s}>{statusLabel(s)}</MenuItem>)}
    </TextField>
  );
  const departmentField = (
    <TextField select label="Department" value={params.department ?? ''} onChange={(e) => setFilter('department', e.target.value)}>
      <MenuItem value="">All departments</MenuItem>
      {departments.map((d) => <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>)}
    </TextField>
  );
  const categoryField = (
    <TextField select label="Category" value={params.category ?? ''} onChange={(e) => setFilter('category', e.target.value)}>
      <MenuItem value="">All categories</MenuItem>
      {categories.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
    </TextField>
  );

  const rowActions = (e: Expense) => (
    <>
      <Tooltip title="View">
        <IconButton size="small" component={RouterLink} to={`/expenses/${e.id}/view`} aria-label={`View ${e.title}`}>
          <Icons.view fontSize="small" />
        </IconButton>
      </Tooltip>
      {!isAdmin && (
        <>
          {/* Only drafts can be changed or removed, so the other rows show these greyed out. */}
          <Tooltip title={e.status === 'DRAFT' ? 'Edit' : 'This expense is no longer a draft, so it cannot be edited'}>
            <span>
              <IconButton size="small" component={RouterLink} to={`/expenses/${e.id}/edit`} disabled={e.status !== 'DRAFT'} aria-label={`Edit ${e.title}`}>
                <Icons.edit fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={e.status === 'DRAFT' ? 'Submit for approval' : 'Only drafts can be submitted'}>
            <span>
              <IconButton size="small" color="primary" disabled={e.status !== 'DRAFT'} onClick={() => submit(e)} aria-label={`Submit ${e.title}`}>
                <Icons.submit fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={e.status === 'DRAFT' ? 'Delete' : 'This expense is no longer a draft, so it cannot be deleted'}>
            <span>
              <IconButton size="small" color="error" disabled={e.status !== 'DRAFT'} onClick={() => setToDelete(e)} aria-label={`Delete ${e.title}`}>
                <Icons.delete fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Search, filter and track expense requests"
        action={!isAdmin && <Button variant="contained" component={RouterLink} to="/expenses/new" startIcon={<Icons.add />}>New expense</Button>}
      />

      <Notice message={message} onClose={() => setMessage('')} />

      {isPhone && (
        <Paper component="section" aria-label="Filters" role="search" sx={{ p: 1, mb: 1.5, display: 'grid', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField fullWidth size="small" label="Search" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            <Badge color="primary" badgeContent={filterCount}>
              <Button variant="outlined" color="inherit" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} startIcon={<Icons.filters />} sx={{ height: 40 }}>
                Filters
              </Button>
            </Badge>
          </Box>
          <Collapse in={filtersOpen}>
            <Box sx={{ display: 'grid', gap: 1.5, pt: 0.5 }}>
              {!isAdmin && categoryField}
              {statusField}
              {isAdmin && departmentField}
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
                <TextField label="From date" type="date" value={params.dateFrom ?? ''} onChange={(e) => setFilter('dateFrom', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="To date" type="date" value={params.dateTo ?? ''} onChange={(e) => setFilter('dateTo', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </Box>
              {hasFilters && <Button variant="outlined" color="inherit" startIcon={<Icons.clearFilters />} onClick={resetFilters}>Clear filters</Button>}
            </Box>
          </Collapse>
        </Paper>
      )}
      {!isPhone && (
      <Paper component="section" aria-label="Filters" role="search" sx={{
        p: 1, mb: 1.5, display: 'grid', gap: 1,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: `minmax(0, 1.5fr) repeat(4, minmax(0, 1fr))${hasFilters ? ' auto' : ''}` },
        '& .MuiInputBase-root, & .MuiInputLabel-root': { fontSize: '0.8125rem' },
        '& .MuiInputBase-input': { py: '5px' },
        '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': { transform: 'translate(14px, 6px)' }, // keeps the label centred in the shorter field
      }}>
        <TextField label="Search" placeholder={isAdmin ? 'Title, description or employee' : 'Title or description'} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        {!isAdmin && categoryField}
        {statusField}
        {isAdmin && departmentField}
        <TextField label="From date" type="date" value={params.dateFrom ?? ''} onChange={(e) => setFilter('dateFrom', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="To date" type="date" value={params.dateTo ?? ''} onChange={(e) => setFilter('dateTo', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        {hasFilters && (
          <Button variant="outlined" color="inherit" startIcon={<Icons.clearFilters />} onClick={resetFilters} sx={{ whiteSpace: 'nowrap', height: 32 }}>
            Clear filters
          </Button>
        )}
      </Paper>
      )}

      {params.spend && (
        <Chip label="Showing spend only: drafts, rejected and failed expenses are excluded" size="small" onDelete={() => setFilter('spend', '')} sx={{ mb: 1.5 }} />
      )}

      {loading && <LoadingState label="Loading expenses…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && expenses.length === 0 && (
        <Paper>
          <EmptyState
            title={hasFilters ? 'No expenses match your filters' : isAdmin ? 'No expenses yet' : 'You have not created any expenses yet'}
            description={hasFilters ? 'Try changing or clearing the filters.' : isAdmin ? 'Expenses will appear here once employees create them.' : 'Create your first expense to get started.'}
            action={hasFilters ? <Button startIcon={<Icons.clearFilters />} onClick={resetFilters}>Clear filters</Button> : isAdmin ? undefined : <Button variant="contained" component={RouterLink} to="/expenses/new" startIcon={<Icons.add />}>Create expense</Button>}
          />
        </Paper>
      )}

      {!loading && !error && expenses.length > 0 && pagination && (
        <Paper>
          {isPhone ? (
            <Box component="ul" aria-label="Expenses" sx={{ listStyle: 'none', m: 0, p: 1, display: 'grid', gap: 1 }}>
              {expenses.map((e) => <ExpenseCard key={e.id} expense={e} showEmployee={isAdmin} actions={<Box sx={{ whiteSpace: 'nowrap' }}>{rowActions(e)}</Box>} />)}
            </Box>
          ) : (
          <TableContainer>
            <Table size="small" aria-label="Expenses">
              <TableHead>
                <TableRow>
                  <TableCell>S.No</TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.sortKey} align={col.numeric ? 'right' : 'left'} sortDirection={params.sortBy === col.sortKey ? params.sortOrder : false}>
                      <TableSortLabel active={params.sortBy === col.sortKey} direction={params.sortBy === col.sortKey ? params.sortOrder : 'asc'} onClick={() => sortBy(col.sortKey)}>
                        {col.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((e, index) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ width: 48 }}>{(pagination.page - 1) * pagination.pageSize + index + 1}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>{e.title}</TableCell>
                    {isAdmin && <TableCell>{e.employee_name}</TableCell>}
                    {isAdmin && <TableCell>{e.department}</TableCell>}
                    <TableCell>{e.category}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(e.amount)}</TableCell>
                    <TableCell><StatusChip status={e.status} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(e.expense_date)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(e.created_at)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{rowActions(e)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          )}
          <Box>
            <TablePagination
              component="div"
              count={pagination.total}
              page={pagination.page - 1}
              rowsPerPage={pagination.pageSize}
              rowsPerPageOptions={[5, 10, 25, 50]}
              onPageChange={(_, page) => setParams((p) => ({ ...p, page: page + 1 }))}
              onRowsPerPageChange={(e) => setParams((p) => ({ ...p, pageSize: Number(e.target.value), page: 1 }))}
            />
          </Box>
        </Paper>
      )}

      {viewing && (
        <ExpenseDetailsDialog
          expenseId={Number(editId)}
          onClose={() => navigate('/expenses')}
          onSubmitted={(text) => {
            setMessage(text);
            navigate('/expenses');
            load();
          }}
        />
      )}

      {(creating || (editId && !viewing)) && (
        <ExpenseFormDialog
          expenseId={editId ? Number(editId) : undefined}
          onClose={() => navigate('/expenses')}
          onSaved={(text) => {
            setMessage(text);
            navigate('/expenses');
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this draft?"
        message={`“${toDelete?.title ?? ''}” will be removed permanently.`}
        confirmLabel="Delete"
        confirmIcon={<Icons.delete />}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

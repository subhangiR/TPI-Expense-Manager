import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import HourglassTopOutlined from '@mui/icons-material/HourglassTopOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import { getExpenseStats, type ExpenseStats } from '../api/expenses';
import { getErrorMessage } from '../api/client';
import { useAppSelector } from '../store/hooks';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import { statusColor, statusLabel, STATUS_ORDER } from '../components/StatusChip';
import BarsChart from '../components/charts/BarsChart';
import DonutChart from '../components/charts/DonutChart';
import type { ChartItem } from '../components/charts/chartTypes';
import AttentionAlerts from '../components/AttentionAlerts';
import { Icons } from '../components/icons';
import TrendChart from '../components/charts/TrendChart';
import DateRangeFilter from '../components/DateRangeFilter';
import { CATEGORY_COLORS } from '../components/charts/useChartColors';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useAwaitingPreview from '../hooks/useAwaitingPreview';
import useExpenseEvents from '../hooks/useExpenseEvents';
import useOutcomeNotices from '../hooks/useOutcomeNotices';
import { isValidRange, loadRange, presetRange, rangeLabel, saveRange, type DateRange } from '../utils/dateRange';
import { attentionNotes } from '../utils/messages';
import { formatCompactCurrency, formatCurrency, formatDateTime } from '../utils/format';

const plural = (count: number) => `${count} ${count === 1 ? 'expense' : 'expenses'}`;
const percent = (part: number, whole: number) => {
  const value = whole > 0 ? (part / whole) * 100 : 0;
  return value > 0 && value < 1 ? '<1%' : `${Math.round(value)}%`;
};

function StatCard({ label, value, icon, hint, details, to }: { label: string; value: string | number; icon: ReactNode; hint?: string; details?: ReactNode; to: string }) {
  return (
    <Paper
      component={RouterLink}
      to={to}
      aria-label={`${label}: ${value}. Show these expenses`}
      sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, color: 'inherit', textDecoration: 'none', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' } }}
    >
      <Box sx={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flexShrink: 0, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.primary.main, 0.14), color: 'primary.main' }}>
        {icon}
      </Box>
      <Box>
        <Typography color="text.secondary" variant="body2" noWrap>
          {label}
        </Typography>
        <Typography component="p" variant="h3" sx={{ lineHeight: 1.2 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: (t) => (t.palette.mode === 'light' ? '#6b7280' : '#8b95a8') }}>
            {hint}
          </Typography>
        )}
        {details}
      </Box>
    </Paper>
  );
}

function ApprovalBanner({ count, amount, inPeriod }: { count: number; amount: number; inPeriod: boolean }) {
  return (
    <Paper sx={{ px: 2, py: 1.25, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', bgcolor: (t) => alpha(t.palette.warning.main, 0.14), borderColor: 'warning.main' }}>
      <HourglassTopOutlined sx={{ color: 'warning.main' }} aria-hidden="true" />
      <Typography sx={{ flex: 1, minWidth: 200 }}>
        <strong>{count}</strong> {count === 1 ? 'expense is' : 'expenses are'} waiting for your approval{inPeriod ? ' in this period' : ''} ({formatCurrency(amount)})
      </Typography>
      <Button variant="contained" component={RouterLink} to="/approvals" endIcon={<Icons.next />}>
        Review now
      </Button>
    </Paper>
  );
}


export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const user = useAppSelector((state) => state.auth.user);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // The chosen period changes every card and chart below. A half-filled custom range is not sent to the server.
  const [range, setRange] = useState<DateRange>(loadRange);
  const validRange = isValidRange(range);
  const { dateFrom, dateTo } = range;
  const latestRequest = useRef(0);

  const changeRange = (next: DateRange) => {
    setRange(next);
    saveRange(next);
  };

  const load = useCallback(async () => {
    if (!validRange) {
      setLoading(false); // an unfinished custom range: wait for both dates
      return;
    }
    const request = ++latestRequest.current;
    setError('');
    try {
      const data = await getExpenseStats({ dateFrom, dateTo });
      if (request === latestRequest.current) setStats(data); // ignore an older answer that arrives late
    } catch (err) {
      if (request === latestRequest.current) setError(getErrorMessage(err));
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [validRange, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);
  useExpenseEvents(load);

  const isAdmin = user?.role === 'admin';
  const awaitingCount = stats?.by_status.find((s) => s.status === 'APPROVAL_REQUIRED')?.count ?? 0;
  const outcomes = useOutcomeNotices({ enabled: !isAdmin && !!user, userId: user?.id, dateFrom, dateTo });
  const oldestAwaiting = useAwaitingPreview({ enabled: !isAdmin && awaitingCount > 0, count: awaitingCount, dateFrom, dateTo });

  const periodText = rangeLabel(range);
  const subtitle = `${isAdmin ? 'Expenses across the whole company' : 'Your expenses at a glance'}${periodText && validRange ? ` · ${periodText}` : ''}`;
  const filtered = range.preset !== 'all';

  let content;
  if (loading) {
    content = <LoadingState label="Loading dashboard…" />;
  } else if (error) {
    content = <ErrorState message={error} onRetry={load} />;
  } else if (!stats || stats.total_count === 0) {
    content = (
      <Paper>
        <EmptyState
          title={filtered ? 'No expenses in this period' : isAdmin ? 'No expenses yet' : 'You have no expenses yet'}
          description={filtered ? 'Try a different date range to see more.' : isAdmin ? 'Statistics will appear here once employees create expenses.' : 'Create your first expense to see your statistics here.'}
          action={
            filtered ? (
              <Button variant="contained" startIcon={<Icons.clearFilters />} onClick={() => changeRange(presetRange('all'))}>
                Show life time
              </Button>
            ) : isAdmin ? undefined : (
              <Button variant="contained" component={RouterLink} to="/expenses/new" startIcon={<Icons.add />}>
                Create expense
              </Button>
            )
          }
        />
      </Paper>
    );
  } else {
    const find = (status: string) => stats.by_status.find((s) => s.status === status);
    const pending = find('APPROVAL_REQUIRED');
    // Same basis as the charts below (drafts, rejected and failed expenses excluded), so the numbers add up.
    const totalSpend = stats.by_category.reduce((sum, row) => sum + row.amount, 0);

    const statusItems: ChartItem[] = STATUS_ORDER.map((status) => ({ status, count: find(status)?.count ?? 0, amount: find(status)?.amount ?? 0 }))
      .filter((row) => row.count > 0)
      .map((row) => ({
        name: statusLabel(row.status),
        value: row.count,
        color: statusColor(row.status),
        legend: String(row.count),
        details: [`${plural(row.count)} (${percent(row.count, stats.total_count)} of all)`, `Total value: ${formatCurrency(row.amount)}`],
      }));

    const spendItems = (rows: { name: string; amount: number; count?: number }[], colorFor: (index: number) => string): ChartItem[] =>
      rows.map((row, index) => ({
        name: row.name,
        value: row.amount,
        color: colorFor(index),
        legend: `${formatCompactCurrency(row.amount)} · ${percent(row.amount, totalSpend)}`,
        details: [
          `Spend: ${formatCurrency(row.amount)}`,
          `${percent(row.amount, totalSpend)} of total spend`,
          ...(row.count ? [`${plural(row.count)}, average ${formatCurrency(row.amount / row.count)}`] : []), // count comes from the newer API
        ],
      }));
    const palette = (index: number) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];

    const topLine = (rows: { name: string; amount: number }[]) =>
      rows.length ? `Highest: ${rows[0].name}, ${percent(rows[0].amount, totalSpend)} of spend` : 'No spend yet';

    const link = (filter: Record<string, string> = {}) => {
      const query = new URLSearchParams(filter);
      if (dateFrom && dateTo) {
        query.set('dateFrom', dateFrom);
        query.set('dateTo', dateTo);
      }
      const text = query.toString();
      return text ? `/expenses?${text}` : '/expenses';
    };

    // Awaiting approval comes first for everyone: it is the one number that needs action.
    const more = (pending?.count ?? 0) - 1;
    const awaitingDetails = oldestAwaiting ? (
      <>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.4, color: 'text.secondary' }}>
          {more > 0 && 'Oldest: '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{formatCurrency(oldestAwaiting.amount)}</Box>
          {' · '}{oldestAwaiting.category}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.4, color: 'text.secondary' }}>
          Submitted {formatDateTime(oldestAwaiting.updated_at)}{more > 0 && ` · +${more} more`}
        </Typography>
      </>
    ) : undefined;
    const awaiting = { label: 'Awaiting approval', value: pending?.count ?? 0, icon: <HourglassTopOutlined />, details: awaitingDetails, to: link({ status: 'APPROVAL_REQUIRED' }) };
    const all = { label: isAdmin ? 'Total expenses' : 'My expenses', value: stats.total_count, icon: <ReceiptLongOutlined />, to: link() };
    const spend = { label: 'Total spend', value: formatCurrency(totalSpend), hint: 'Excludes drafts, rejected and failed', icon: <PaymentsOutlined />, to: link({ spend: 'true' }) };
    const completed = { label: 'Completed', value: find('COMPLETED')?.count ?? 0, icon: <CheckCircleOutlined />, to: link({ status: 'COMPLETED' }) };
    const cards = isAdmin ? [awaiting, all, spend, completed] : [awaiting, completed, all, spend];

    content = (
      <>
        {isAdmin && pending && pending.count > 0 && <ApprovalBanner count={pending.count} amount={pending.amount} inPeriod={filtered} />}
        {!isAdmin && (
          <AttentionAlerts
            notes={attentionNotes({ draft: find('DRAFT')?.count ?? 0, rejected: outcomes.rejected.length, failed: outcomes.failed.length }, filtered).map((note) => {
              // Rejected and failed are announced once: "Mark as read" hides them for those expenses.
              if (note.status === 'REJECTED') return { ...note, onDismiss: () => outcomes.markRead(outcomes.rejected) };
              if (note.status === 'FAILED') return { ...note, onDismiss: () => outcomes.markRead(outcomes.failed) };
              return note;
            })}
            linkFor={(status) => link({ status })}
          />
        )}

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, mb: 1.5 }}>
          {cards.map((card) => <StatCard key={card.label} {...card} />)}
        </Box>


        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
          {isAdmin ? (
            <>
              <BarsChart title="Spend by department" description={topLine(stats.by_department)} items={spendItems(stats.by_department, () => CATEGORY_COLORS[0])} />
              <BarsChart title="Spend by category" description={topLine(stats.by_category)} items={spendItems(stats.by_category, () => CATEGORY_COLORS[2])} />
              <DonutChart title="Expenses by status" description="Share of expenses at each workflow step" items={statusItems} center={{ value: String(stats.total_count), caption: 'expenses' }} />
              <TrendChart unit={stats.period_unit} data={stats.by_period} />
            </>
          ) : (
            <>
              <DonutChart title="Spend by category" description="Share of total spend, highest first" items={spendItems(stats.by_category, palette)} center={{ value: formatCompactCurrency(totalSpend), caption: 'total spend' }} />
              <DonutChart title="Expenses by status" description="Share of expenses at each workflow step" items={statusItems} center={{ value: String(stats.total_count), caption: 'expenses' }} />
              <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>
                <TrendChart unit={stats.period_unit} data={stats.by_period} />
              </Box>
            </>
          )}
        </Box>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={subtitle}
        action={<DateRangeFilter value={range} onChange={changeRange} />}
      />
      {content}
    </>
  );
}

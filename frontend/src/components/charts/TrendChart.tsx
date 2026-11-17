import { Bar, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import ChartCard, { CHART_HEIGHT } from './ChartCard';
import ChartTooltip from './ChartTooltip';
import useChartColors from './useChartColors';
import { formatCompactCurrency, formatCurrency, formatDate, formatMonth, formatMonthLong } from '../../utils/format';

type Unit = 'day' | 'month';

interface Props {
  unit: Unit;
  data: { period: string; amount: number; count?: number }[]; // period is "YYYY-MM-DD" or "YYYY-MM"; count is missing if the server is older than the chart
}

interface Point {
  name: string;
  title: string;
  amount: number;
  lines: string[];
}

const MAX_LABELLED_POINTS = 12; // more labels than this would overlap, so only the tooltip shows the values
const plural = (count: number) => `${count} ${count === 1 ? 'expense' : 'expenses'}`;

const titleOf = (unit: Unit, period: string) => (unit === 'day' ? formatDate(period) : formatMonthLong(period));
const shortTitleOf = (unit: Unit, period: string) => (unit === 'day' ? formatDate(period) : formatMonthLong(period).split(' ')[0]);

const countLine = (amount: number, count?: number) => {
  if (count === undefined) return [];
  return [count === 0 ? 'No expenses' : `${plural(count)}, average ${formatCurrency(amount / count)}`];
};

function changeLine(unit: Unit, amount: number, previous: { period: string; amount: number } | undefined): string {
  if (!previous) return `First ${unit} shown`;
  const name = shortTitleOf(unit, previous.period);
  if (previous.amount === 0) return amount === 0 ? `No spend in either ${unit}` : `No spend ${unit === 'day' ? 'on' : 'in'} ${name} to compare with`;
  const percent = Math.round(((amount - previous.amount) / previous.amount) * 100);
  if (percent === 0) return `Same as ${name}`;
  return `${percent > 0 ? '▲' : '▼'} ${Math.abs(percent)}% ${percent > 0 ? 'more' : 'less'} than ${name}`;
}

export default function TrendChart({ unit, data }: Props) {
  const colors = useChartColors();
  const spansYears = unit === 'month' && new Set(data.map((item) => item.period.slice(0, 4))).size > 1;

  const points: Point[] = data.map((item, index) => ({
    name: unit === 'day' ? String(Number(item.period.slice(8))) : `${formatMonth(item.period)}${spansYears ? ` ’${item.period.slice(2, 4)}` : ''}`,
    title: titleOf(unit, item.period),
    amount: item.amount,
    lines: [`Spend: ${formatCurrency(item.amount)}`, ...countLine(item.amount, item.count), changeLine(unit, item.amount, data[index - 1])],
  }));
  const summary = points.map((p) => `${p.title}: ${formatCurrency(p.amount)}`).join(', ');

  return (
    <ChartCard
      title="Spend trend"
      description={unit === 'day' ? 'Daily spend in the selected period' : 'Monthly spend in the selected period'}
      summary={summary}
      height={CHART_HEIGHT}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 20, right: 16, left: 16 }}>
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis dataKey="name" tickLine={false} minTickGap={8} axisLine={{ stroke: colors.grid }} tick={{ fill: colors.text, fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: colors.cursor }}
            allowEscapeViewBox={{ x: false, y: true }} // x stays false so the box flips left near the card edge
            wrapperStyle={{ zIndex: 10, pointerEvents: 'none' }}
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as Point | undefined) : undefined;
              return point ? <ChartTooltip title={point.title} color={colors.primary} lines={point.lines} /> : null;
            }}
          />
          <Bar dataKey="amount" name="Spend" fill={colors.primarySoft} maxBarSize={40} radius={[4, 4, 0, 0]} />
          <Line dataKey="amount" name="Spend" type="monotone" stroke={colors.primary} strokeWidth={2.5} dot={{ r: points.length > MAX_LABELLED_POINTS ? 2.5 : 4, fill: colors.primary }} activeDot={{ r: 6 }}>
            {points.length <= MAX_LABELLED_POINTS && (
              <LabelList dataKey="amount" position="top" offset={10} formatter={(value) => formatCompactCurrency(Number(value))} fontSize={11} fill={colors.text} />
            )}
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

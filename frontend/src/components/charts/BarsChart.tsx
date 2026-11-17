import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard, { CHART_HEIGHT } from './ChartCard';
import ChartTooltip from './ChartTooltip';
import type { ChartItem } from './chartTypes';
import useChartColors from './useChartColors';

interface Props {
  title: string;
  description: string;
  items: ChartItem[]; // already sorted, highest first
}

export default function BarsChart({ title, description, items }: Props) {
  const colors = useChartColors();
  const summary = items.map((item) => `${item.name}: ${item.legend}`).join(', ');

  return (
    <ChartCard title={title} description={description} summary={summary} height={CHART_HEIGHT}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ left: 0, right: 90, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 12, fill: colors.text }} />
          <Tooltip
            cursor={{ fill: colors.cursor }}
            allowEscapeViewBox={{ x: false, y: true }} // x stays false so the box flips left near the card edge
            wrapperStyle={{ zIndex: 10, pointerEvents: 'none' }}
            content={({ active, payload }) => {
              const item = active ? (payload?.[0]?.payload as ChartItem | undefined) : undefined;
              return item ? <ChartTooltip title={item.name} color={item.color} lines={item.details} /> : null;
            }}
          />
          <Bar dataKey="value" name={title} radius={[0, 4, 4, 0]} barSize={14}>
            {items.map((item, index) => <Cell key={item.name} fill={index === 0 ? item.color : `${item.color}99`} />)}
            <LabelList dataKey="legend" position="right" fontSize={12} fill={colors.text} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

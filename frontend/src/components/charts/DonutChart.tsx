import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ChartCard, { CHART_HEIGHT } from './ChartCard';
import ChartTooltip from './ChartTooltip';
import type { ChartItem } from './chartTypes';

interface Props {
  title: string;
  description: string;
  items: ChartItem[];
  center: { value: string; caption: string };
}

export default function DonutChart({ title, description, items, center }: Props) {
  const summary = items.map((item) => `${item.name}: ${item.legend}`).join(', ');

  return (
    <ChartCard title={title} description={description} summary={summary} height={CHART_HEIGHT}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 3 }}>
        <Box sx={{ position: 'relative', width: 150, height: '100%', flexShrink: 0 }}>
          {/* Above the centre label (zIndex), so the hover box is never covered by it. */}
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={items} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
                {items.map((item) => <Cell key={item.name} fill={item.color} />)}
              </Pie>
              <Tooltip
                allowEscapeViewBox={{ x: true, y: true }} // the box may extend beyond the narrow donut area
                wrapperStyle={{ zIndex: 10, pointerEvents: 'none' }}
                content={({ active, payload }) => {
                  const item = active ? (payload?.[0]?.payload as ChartItem | undefined) : undefined;
                  return item ? <ChartTooltip title={item.name} color={item.color} lines={item.details} /> : null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          </Box>
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, display: 'grid', placeContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
            <Typography component="span" variant="h3" sx={{ lineHeight: 1.1 }}>{center.value}</Typography>
            <Typography component="span" variant="body2" color="text.secondary">{center.caption}</Typography>
          </Box>
        </Box>
        {/* A 3-column grid (dot | name | value): values line up right after the longest name instead of far away at the edge. */}
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'auto auto auto', columnGap: 1, rowGap: 0.5, alignItems: 'center', minWidth: 0 }}>
          {items.map((item) => (
            <Box component="li" key={item.name} sx={{ display: 'contents' }}>
              <Box aria-hidden="true" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
              <Typography variant="body2" noWrap sx={{ color: 'text.primary', pr: 1 }}>{item.name}</Typography>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, textAlign: 'right' }}>{item.legend}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </ChartCard>
  );
}

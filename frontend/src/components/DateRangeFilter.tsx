import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { PRESET_OPTIONS, presetRange, type DateRange, type RangePreset } from '../utils/dateRange';

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangeFilter({ value, onChange }: Props) {
  const choose = (preset: RangePreset) => {
    // Custom starts from the dates already on screen, so the user only has to adjust them.
    onChange(preset === 'custom' ? { preset, dateFrom: value.dateFrom, dateTo: value.dateTo } : presetRange(preset));
  };

  const custom = value.preset === 'custom';
  const reversed = !!value.dateFrom && !!value.dateTo && value.dateFrom > value.dateTo;

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }} role="group" aria-label="Date range">
      <TextField select label="Period" value={value.preset} onChange={(e) => choose(e.target.value as RangePreset)} sx={{ minWidth: 150 }}>
        {PRESET_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </TextField>
      {custom && (
        <>
          <TextField
            label="From" type="date" value={value.dateFrom ?? ''} sx={{ width: 150 }}
            onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: value.dateTo || undefined } }}
            error={reversed}
          />
          <TextField
            label="To" type="date" value={value.dateTo ?? ''} sx={{ width: 150 }}
            onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: value.dateFrom || undefined } }}
            error={reversed}
            helperText={reversed ? 'To must be on or after From' : !value.dateFrom || !value.dateTo ? 'Pick both dates' : ''}
          />
        </>
      )}
    </Box>
  );
}

// Turns "before" and "after" versions of an expense into readable audit text, one line per changed field:
//   Amount: 950 → 1200
// Returns null when nothing changed, so no empty audit row is written.
const FIELDS = [
  ['title', 'Title'],
  ['employee_name', 'Employee'],
  ['department', 'Department'],
  ['category', 'Category'],
  ['amount', 'Amount'],
  ['expense_date', 'Expense date'],
  ['description', 'Description'],
  ['priority', 'Priority'],
];

const show = (value) => (value === null || value === undefined || value === '' ? '—' : String(value));

function describeChanges(before, after) {
  const lines = FIELDS.filter(([key]) => show(before[key]) !== show(after[key])).map(
    ([key, label]) => `${label}: ${show(before[key])} → ${show(after[key])}`
  );
  return lines.length > 0 ? lines.join('\n') : null;
}

module.exports = describeChanges;

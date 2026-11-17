
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export const formatCurrency = (amount: number) => currency.format(amount);

// "₹12.5K": short enough to print on a chart bar without overlapping its neighbours.
const compactCurrency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });
export const formatCompactCurrency = (amount: number) => compactCurrency.format(amount);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-11-10" -> "10 Nov 2026". We split the text instead of using new Date(),
// because new Date("2026-11-10") is read as UTC and can show the previous day in some timezones.
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

// "2026-11-13T09:20:25.094Z" -> "13 Nov 2026, 2:50 pm" in the user's own timezone.
export function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const formatMonthLong = (yearMonth: string) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${MONTHS_LONG[month - 1]} ${year}`;
};

export const formatMonth = (yearMonth: string) => MONTHS[Number(yearMonth.split('-')[1]) - 1];

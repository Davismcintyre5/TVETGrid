const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

function toDate(value) {
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function formatDate(value, style = 'short') {
  const d = toDate(value);
  if (!d) return '—';
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  if (style === 'short') return `${pad(day)} ${MONTHS_SHORT[month]} ${year}`;
  if (style === 'medium') return `${day} ${MONTHS_SHORT[month]} ${year}`;
  if (style === 'long') return `${MONTHS_LONG[month]} ${day}, ${year}`;
  if (style === 'full') return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_LONG[month]} ${day}, ${year}`;
  return `${pad(day)} ${MONTHS_SHORT[month]} ${year}`;
}

export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return `${formatDate(d, 'medium')}, ${formatTime(d)}`;
}

export function formatTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ampm}`;
}

export function relativeTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  const diffMs = Date.now() - d.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);

  const sec = Math.round(abs / 1000);
  const min = Math.round(abs / 60000);
  const hr = Math.round(abs / 3600000);
  const day = Math.round(abs / 86400000);

  let label;
  if (sec < 60) label = `${sec}s`;
  else if (min < 60) label = `${min} min`;
  else if (hr < 24) label = `${hr} hr`;
  else if (day < 7) label = `${day} day${day === 1 ? '' : 's'}`;
  else return formatDate(d, 'medium');

  return future ? `in ${label}` : `${label} ago`;
}

export function isPast(value) {
  const d = toDate(value);
  if (!d) return false;
  return d.getTime() < Date.now();
}

export function isToday(value) {
  const d = toDate(value);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
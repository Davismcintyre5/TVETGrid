function addMinutes(date, n) {
  return new Date(new Date(date).getTime() + n * 60 * 1000);
}

function addDays(date, n) {
  return new Date(new Date(date).getTime() + n * 24 * 60 * 60 * 1000);
}

function isPast(date) {
  return new Date(date).getTime() < Date.now();
}

function isBetween(date, start, end) {
  const t = new Date(date).getTime();
  return t >= new Date(start).getTime() && t <= new Date(end).getTime();
}

function toICSDate(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function humanDiff(date) {
  const diff = new Date(date).getTime() - Date.now();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return `${mins} min`;
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return `${hrs} hr`;
  return `${Math.round(hrs / 24)} days`;
}

module.exports = { addMinutes, addDays, isPast, isBetween, toICSDate, humanDiff };
export function formatBytes(bytes, decimals = 1) {
  if (bytes === null || bytes === undefined) return '—';
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = -1;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const rounded = value.toFixed(decimals);
  return `${parseFloat(rounded)} ${units[unitIndex]}`;
}
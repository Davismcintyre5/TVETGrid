export default function Skeleton({ variant = 'rect', lines = 1, className = '' }) {
  const base = 'animate-pulse bg-[var(--bg-tertiary)]';

  if (variant === 'circle') {
    return <div className={`${base} rounded-full ${className}`} />;
  }

  if (variant === 'text') {
    const widths = ['100%', '92%', '85%', '70%'];
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${base} h-3 rounded`}
            style={{ width: widths[i % widths.length] }}
          />
        ))}
      </div>
    );
  }

  return <div className={`${base} rounded-lg ${className}`} />;
}
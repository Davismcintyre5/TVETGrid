export default function Tabs({ tabs = [], active, onChange, className = '' }) {
  return (
    <div
      className={`flex gap-1 border-b border-[var(--border-color)] overflow-x-auto ${className}`}
      role="tablist"
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(t.key)}
            className={[
              'flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              isActive
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {t.icon && <span className="w-4 h-4">{t.icon}</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
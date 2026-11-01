const VARIANTS = {
  default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)]',
  success: 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]',
  info: 'bg-[var(--info-bg)] text-[var(--info-text)] border-[var(--info-border)]',
};

export default function Badge({ variant = 'default', dot = false, children, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        VARIANTS[variant] || VARIANTS.default,
        className,
      ].join(' ')}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
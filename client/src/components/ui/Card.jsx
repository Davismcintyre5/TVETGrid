export default function Card({
  title,
  description,
  actions,
  padding = true,
  className = '',
  children,
}) {
  return (
    <div
      className={`bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-sm)] ${className}`}
    >
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--border-color)]">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </div>
  );
}
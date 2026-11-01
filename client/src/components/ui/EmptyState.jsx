import Button from './Button';

export default function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
    >
      {icon && (
        <div className="w-14 h-14 mb-4 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-5">{description}</p>
      )}
      {action &&
        (typeof action === 'object' && action.label ? (
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : (
          action
        ))}
    </div>
  );
}
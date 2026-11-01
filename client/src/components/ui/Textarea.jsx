import { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea(
  { label, hint, error, rows = 3, className = '', id, required = false, ...rest },
  ref
) {
  const inputId = id || `ta-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
        >
          {label}
          {required && <span className="text-[var(--danger-text)] ml-0.5">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={[
          'w-full rounded-lg text-sm px-3 py-2 transition-colors',
          'bg-[var(--input-bg)] text-[var(--text-primary)]',
          'placeholder:text-[var(--text-muted)]',
          'border focus:outline-none focus:ring-2 resize-y',
          error
            ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-[var(--danger-text)]/20'
            : 'border-[var(--input-border)] focus:border-[var(--input-focus)] focus:ring-[var(--brand-primary)]/20',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        ].join(' ')}
        {...rest}
      />
      {error ? (
        <p className="mt-1 text-xs text-[var(--danger-text)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
});

export default Textarea;
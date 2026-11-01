import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    iconLeft,
    iconRight,
    type = 'text',
    className = '',
    id,
    required = false,
    ...rest
  },
  ref
) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

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
      <div className="relative">
        {iconLeft && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)] pointer-events-none">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={[
            'w-full rounded-lg text-sm transition-colors',
            'bg-[var(--input-bg)] text-[var(--text-primary)]',
            'placeholder:text-[var(--text-muted)]',
            'border focus:outline-none focus:ring-2',
            error
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-[var(--danger-text)]/20'
              : 'border-[var(--input-border)] focus:border-[var(--input-focus)] focus:ring-[var(--brand-primary)]/20',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            iconLeft ? 'pl-10' : 'pl-3',
            iconRight ? 'pr-10' : 'pr-3',
            'py-2',
          ].join(' ')}
          {...rest}
        />
        {iconRight && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)]">
            {iconRight}
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-[var(--danger-text)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
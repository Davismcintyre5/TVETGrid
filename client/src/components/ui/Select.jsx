import { forwardRef } from 'react';
import { HiChevronDown } from 'react-icons/hi';

const Select = forwardRef(function Select(
  { label, hint, error, options = [], placeholder, className = '', id, required = false, ...rest },
  ref
) {
  const inputId = id || `sel-${Math.random().toString(36).slice(2, 9)}`;

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
        <select
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-lg text-sm px-3 py-2 pr-9 transition-colors appearance-none',
            'bg-[var(--input-bg)] text-[var(--text-primary)]',
            'border focus:outline-none focus:ring-2',
            error
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)] focus:ring-[var(--danger-text)]/20'
              : 'border-[var(--input-border)] focus:border-[var(--input-focus)] focus:ring-[var(--brand-primary)]/20',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          ].join(' ')}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const value = typeof opt === 'string' ? opt : opt.value;
            const text = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
        <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-[var(--danger-text)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
});

export default Select;
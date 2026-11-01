import { forwardRef } from 'react';

const Checkbox = forwardRef(function Checkbox(
  { label, className = '', id, ...rest },
  ref
) {
  const inputId = id || `cb-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <label
      htmlFor={inputId}
      className={`inline-flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)] ${className}`}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="w-4 h-4 rounded border-[var(--input-border)] accent-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 cursor-pointer"
        {...rest}
      />
      {label && <span className="select-none">{label}</span>}
    </label>
  );
});

export default Checkbox;
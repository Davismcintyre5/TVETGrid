import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';

const VARIANTS = {
  primary:
    'bg-[var(--brand-primary)] text-white hover:opacity-90 active:opacity-95 disabled:opacity-50',
  secondary:
    'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--border-color)] disabled:opacity-50',
  outline:
    'bg-transparent text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] disabled:opacity-50',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)] disabled:opacity-50',
  danger:
    'bg-[var(--danger-text)] text-white hover:opacity-90 active:opacity-95 disabled:opacity-50',
  success:
    'bg-[var(--success-text)] text-white hover:opacity-90 active:opacity-95 disabled:opacity-50',
  warning:
    'bg-[var(--warning-text)] text-white hover:opacity-90 active:opacity-95 disabled:opacity-50',
};

const SIZES = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2',
};

const SPINNER_SIZE = { sm: 'xs', md: 'sm', lg: 'sm' };

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    disabled = false,
    fullWidth = false,
    type = 'button',
    to,
    href,
    onClick,
    children,
    className = '',
    ...rest
  },
  ref
) {
  const classes = [
    'inline-flex items-center justify-center font-medium rounded-lg transition-all',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? 'w-full' : '',
    (disabled || loading) ? 'pointer-events-none' : 'cursor-pointer',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? (
        <Spinner size={SPINNER_SIZE[size] || 'sm'} className="text-current" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children && <span className="truncate">{children}</span>}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} ref={ref} {...rest}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} ref={ref} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;
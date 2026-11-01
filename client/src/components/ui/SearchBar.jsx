import { useEffect, useState } from 'react';
import { HiSearch, HiX } from 'react-icons/hi';

export default function SearchBar({
  value = '',
  onChange,
  onDebouncedChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className = '',
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (!onDebouncedChange) return undefined;
    const t = setTimeout(() => onDebouncedChange(local), debounceMs);
    return () => clearTimeout(t);
  }, [local, debounceMs, onDebouncedChange]);

  const handle = (v) => {
    setLocal(v);
    onChange?.(v);
  };

  return (
    <div className={`relative ${className}`}>
      <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
      <input
        type="search"
        value={local}
        onChange={(e) => handle(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 rounded-lg text-sm bg-[var(--input-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--input-border)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
      />
      {local && (
        <button
          type="button"
          onClick={() => handle('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)]"
          aria-label="Clear search"
        >
          <HiX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
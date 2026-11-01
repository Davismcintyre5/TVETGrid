import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

function range(page, totalPages, maxVisible) {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(2, page - half);
  let end = Math.min(totalPages - 1, start + maxVisible - 3);
  if (end - start < maxVisible - 3) start = Math.max(2, end - (maxVisible - 3));
  const pages = [1];
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('…');
  pages.push(totalPages);
  return pages;
}

export default function Pagination({ page = 1, totalPages = 1, onPageChange, maxVisible = 5 }) {
  if (totalPages <= 1) return null;
  const pages = range(page, totalPages, maxVisible);

  const btn =
    'inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-lg text-sm transition-colors border';
  const inactive =
    'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]';
  const active = 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white';

  return (
    <nav className="flex items-center justify-center gap-1 mt-6" aria-label="Pagination">
      <button
        className={`${btn} ${inactive} disabled:opacity-40 disabled:cursor-not-allowed`}
        onClick={() => onPageChange?.(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <HiChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e-${i}`} className="px-2 text-[var(--text-muted)] text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`${btn} ${p === page ? active : inactive}`}
            onClick={() => p !== page && onPageChange?.(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        className={`${btn} ${inactive} disabled:opacity-40 disabled:cursor-not-allowed`}
        onClick={() => onPageChange?.(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <HiChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
import { useState } from 'react';

export default function Tooltip({ content, children, side = 'top' }) {
  const [show, setShow] = useState(false);
  const pos = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }[side] || 'bottom-full mb-2 left-1/2 -translate-x-1/2';

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && content && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-50 whitespace-nowrap px-2 py-1 rounded-md text-xs bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-[var(--shadow-md)] ${pos}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
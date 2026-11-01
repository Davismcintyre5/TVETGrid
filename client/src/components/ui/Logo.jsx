import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBranding } from '@/context/BrandingContext';

const SIZES = {
  sm: { icon: 'w-6 h-6', text: 'text-sm' },
  md: { icon: 'w-8 h-8', text: 'text-base' },
  lg: { icon: 'w-10 h-10', text: 'text-lg' },
};

export default function Logo({ size = 'md', showText = true, linkTo = '/', className = '' }) {
  const { branding, resolvedLogoUrl } = useBranding();
  const [broken, setBroken] = useState(false);
  const [fallbackBroken, setFallbackBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    setFallbackBroken(false);
  }, [resolvedLogoUrl]);

  const s = SIZES[size] || SIZES.md;
  const appName = branding?.appName || 'TVETGrid';
  const src = broken ? '/logo.svg' : resolvedLogoUrl;

  const content = (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {!fallbackBroken ? (
        <img
          src={src}
          alt={appName}
          className={`${s.icon} object-contain`}
          onError={() => {
            if (!broken) setBroken(true);
            else setFallbackBroken(true);
          }}
        />
      ) : (
        <span
          className={`${s.icon} inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white font-bold`}
        >
          {appName[0]}
        </span>
      )}
      {showText && (
        <span className={`${s.text} font-bold text-[var(--text-primary)] tracking-tight`}>
          {appName}
        </span>
      )}
    </div>
  );

  if (!linkTo) return content;
  return (
    <Link to={linkTo} aria-label={appName} className="inline-flex">
      {content}
    </Link>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBranding } from '@/context/BrandingContext';

const SIZES = {
  sm: { icon: 'w-8 h-8', text: 'text-lg' },       
  md: { icon: 'w-10 h-10', text: 'text-xl' },     // Reduced text to 20px, logo 40px
  lg: { icon: 'w-12 h-12', text: 'text-2xl' },    
  xl: { icon: 'w-16 h-16', text: 'text-3xl' },    
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
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {!fallbackBroken ? (
        <img
          src={src}
          alt={appName}
          className={`${s.icon} object-contain rounded-full shrink-0`}
          onError={() => {
            if (!broken) setBroken(true);
            else setFallbackBroken(true);
          }}
        />
      ) : (
        <span
          className={`${s.icon} inline-flex items-center justify-center rounded-full bg-[#4F46E5] text-white font-bold shrink-0`}
        >
          {appName[0]}
        </span>
      )}
      
      {showText && (
        <span className="font-bold text-[var(--text-primary)] tracking-tight hidden sm:inline-block">
          {size === 'sm' && <span className="text-lg">{appName}</span>}
          {size === 'md' && <span className="text-xl">{appName}</span>}
          {size === 'lg' && <span className="text-2xl">{appName}</span>}
          {size === 'xl' && <span className="text-3xl">{appName}</span>}
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
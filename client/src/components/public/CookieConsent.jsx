import { useEffect, useState } from 'react';
import { HiOutlineCake } from 'react-icons/hi2';
import { Button } from '@/components/ui';
import { storage } from '@/utils/storage';
import { useLegalModal } from './LegalModal';

const STORAGE_KEY = 'cookieConsent';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export default function CookieConsent() {
  const { open: openLegal } = useLegalModal();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = storage.get(STORAGE_KEY, null);
    if (!saved) {
      setVisible(true);
      return;
    }
    const at = saved?.at ? new Date(saved.at).getTime() : 0;
    if (!at || Date.now() - at > ONE_YEAR_MS) {
      setVisible(true);
    }
  }, []);

  const decide = (decision) => {
    storage.set(STORAGE_KEY, { decision, at: new Date().toISOString() });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur shadow-[var(--shadow-lg)] animate-slide-in-up"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <HiOutlineCake className="w-5 h-5 text-[var(--brand-primary)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            We use cookies to improve your experience and understand how the site
            is used. You can accept or reject non-essential cookies.{' '}
            <button
              type="button"
              onClick={() => openLegal('cookies')}
              className="text-[var(--brand-primary)] underline hover:opacity-80 font-medium"
            >
              Learn more
            </button>
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => decide('rejected')}
            className="flex-1 md:flex-none"
          >
            Reject
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => decide('accepted')}
            className="flex-1 md:flex-none"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
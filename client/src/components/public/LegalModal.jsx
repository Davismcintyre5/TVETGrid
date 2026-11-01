import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiScale } from 'react-icons/hi';
import { Modal, Spinner, EmptyState } from '@/components/ui';
import { siteApi } from '@/api';
import { formatDate } from '@/utils/formatDate';

const LegalContext = createContext(null);

export function LegalProvider({ children }) {
  const [slug, setSlug] = useState(null);

  const open = useCallback((next) => setSlug(next || 'terms'), []);
  const close = useCallback(() => setSlug(null), []);

  const value = useMemo(() => ({ slug, open, close }), [slug, open, close]);

  return (
    <LegalContext.Provider value={value}>
      {children}
      <LegalModal slug={slug} onClose={close} />
    </LegalContext.Provider>
  );
}

export function useLegalModal() {
  const ctx = useContext(LegalContext);
  if (!ctx) throw new Error('useLegalModal must be used inside LegalProvider');
  return ctx;
}

function LegalModal({ slug, onClose }) {
  const enabled = !!slug;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['legal', slug],
    queryFn: async () => {
      const res = await siteApi.getLegal(slug);
      return res?.data || res;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const doc = data || null;

  return (
    <Modal
      open={enabled}
      onClose={onClose}
      title={doc?.title || 'Legal Document'}
      size="xl"
    >
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Spinner size="md" />
        </div>
      )}

      {isError && (
        <EmptyState
          icon={<HiScale className="w-6 h-6" />}
          title="Couldn't load document"
          description={error?.message || 'Please try again later.'}
        />
      )}

      {doc && (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            v{doc.version || 1}
            {doc.effectiveAt && (
              <>
                {' · Effective '}
                {formatDate(doc.effectiveAt, 'long')}
              </>
            )}
          </p>
          <div className="prose-themed">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text-secondary)] m-0 p-0 bg-transparent">
              {doc.bodyMd || 'No content yet.'}
            </pre>
          </div>
        </div>
      )}
    </Modal>
  );
}
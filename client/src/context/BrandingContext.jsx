import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { siteApi } from '@/api';

const BrandingContext = createContext(null);

const FALLBACK = {
  appName: 'TVETGrid',
  logoUrl: '',
  supportEmail: '',
  supportPhone: '',
  contactAddress: '',
  socialLinks: {},
  faq: [],
};

export function BrandingProvider({ children }) {
  const query = useQuery({
    queryKey: ['branding', 'settings'],
    queryFn: async () => {
      const res = await siteApi.getSettings();
      return res?.data || FALLBACK;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: FALLBACK,
  });

  const value = useMemo(() => {
    const branding = { ...FALLBACK, ...(query.data || {}) };
    const resolvedLogoUrl = branding.logoUrl && branding.logoUrl.trim()
      ? branding.logoUrl
      : '/logo.svg';

    return {
      branding,
      resolvedLogoUrl,
      loading: query.isLoading,
      error: query.error,
      refetch: query.refetch,
    };
  }, [query.data, query.isLoading, query.error, query.refetch]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used inside BrandingProvider');
  return ctx;
}
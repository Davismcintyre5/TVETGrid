import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@/context/ThemeContext';
import { BrandingProvider } from '@/context/BrandingContext';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { ToastProvider } from '@/context/ToastContext';
import { LegalProvider } from '@/components/public/LegalModal';

import AppRoutes from '@/routes/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ThemeProvider>
          <BrandingProvider>
            <LegalProvider>
              <AuthProvider>
                <SocketProvider>
                  <ToastProvider>
                    <AppRoutes />
                  </ToastProvider>
                </SocketProvider>
              </AuthProvider>
            </LegalProvider>
          </BrandingProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
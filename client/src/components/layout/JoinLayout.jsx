import { Logo } from '@/components/ui';

export default function JoinLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <header className="p-6 flex items-center justify-center">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">{children}</div>
      </main>

      <footer className="text-center text-xs text-[var(--text-muted)] py-4">
        Powered by TVETGrid
      </footer>
    </div>
  );
}
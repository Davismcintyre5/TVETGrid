import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { HiArrowLeft, HiLockClosed } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, Input } from '@/components/ui';
import { useLegalModal } from '@/components/public/LegalModal';
import { parseApiError } from '@/utils/parseApiError';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { open: openLegal } = useLegalModal();
  const [params] = useSearchParams();

  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/app" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Welcome back');
      navigate('/app', { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);

      if (err.code === 'EMAIL_NOT_VERIFIED') {
        toast.info('Please verify your email');
        navigate(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }

      setError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <HiArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Log in</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Welcome back to TVETGrid.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--danger-bg)] text-[var(--danger-text)] text-sm border border-[var(--danger-border)]">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          iconLeft={<HiLockClosed className="w-4 h-4" />}
        />

        <div className="flex items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-[var(--brand-primary)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Sign in
        </Button>
      </form>

      <p className="text-sm text-center mt-6 text-[var(--text-secondary)]">
        Don't have an account?{' '}
        <Link to="/register" className="text-[var(--brand-primary)] font-medium hover:underline">
          Register
        </Link>
      </p>

      <p className="text-xs text-center mt-4 text-[var(--text-muted)]">
        By continuing you agree to our{' '}
        <button
          type="button"
          onClick={() => openLegal('terms')}
          className="text-[var(--brand-primary)] underline"
        >
          Terms
        </button>{' '}
        and{' '}
        <button
          type="button"
          onClick={() => openLegal('privacy')}
          className="text-[var(--brand-primary)] underline"
        >
          Privacy
        </button>
        .
      </p>
    </>
  );
}
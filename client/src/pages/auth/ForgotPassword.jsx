import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiCheckCircle, HiOutlineEnvelope } from 'react-icons/hi2';
import { Button, Input } from '@/components/ui';
import { authApi } from '@/api';
import { useToast } from '@/context/ToastContext';
import { isValidEmail } from '@/utils/validators';
import { parseApiError } from '@/utils/parseApiError';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
      toast.success('If that email exists, a reset link was sent');
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <>
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--success-bg)] text-[var(--success-text)] mb-4">
            <HiCheckCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Check your email</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
            If an account exists for{' '}
            <strong className="text-[var(--text-primary)]">{email}</strong>, we&rsquo;ve
            sent a password reset link. It expires in 10 minutes.
          </p>

          <Button
            fullWidth
            size="lg"
            onClick={() =>
              navigate(`/reset?email=${encodeURIComponent(email.trim().toLowerCase())}`)
            }
          >
            Enter reset code
          </Button>

          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail('');
            }}
            className="mt-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Try a different email
          </button>
        </div>

        <p className="text-sm text-center mt-6 text-[var(--text-secondary)]">
          Remembered it?{' '}
          <Link to="/login" className="text-[var(--brand-primary)] font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <HiArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bg-tertiary)] text-[var(--brand-primary)] mb-4">
          <HiOutlineEnvelope className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Forgot your password?
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Enter your email and we&rsquo;ll send you a link to reset it.
        </p>
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
          placeholder="Your Email"
          autoComplete="email"
          required
        />

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Send reset link
        </Button>
      </form>

      <p className="text-sm text-center mt-6 text-[var(--text-secondary)]">
        Remembered it?{' '}
        <Link to="/login" className="text-[var(--brand-primary)] font-medium hover:underline">
          Back to login
        </Link>
      </p>
    </>
  );
}
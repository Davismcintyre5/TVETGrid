import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HiArrowLeft, HiLockClosed } from 'react-icons/hi';
import { Button, Input } from '@/components/ui';
import { authApi } from '@/api';
import { useToast } from '@/context/ToastContext';
import { isStrongPassword, getPasswordStrength } from '@/utils/validators';
import { parseApiError } from '@/utils/parseApiError';

const STRENGTH_COLORS = {
  weak: 'bg-[var(--danger-text)]',
  fair: 'bg-[var(--warning-text)]',
  good: 'bg-[var(--info-text)]',
  strong: 'bg-[var(--success-text)]',
};

const STRENGTH_LABELS = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

const STRENGTH_WIDTH = {
  weak: '25%',
  fair: '50%',
  good: '75%',
  strong: '100%',
};

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = password ? getPasswordStrength(password) : null;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!code.trim() || code.trim().length < 4) {
      setError('Enter the code from your email');
      return;
    }
    if (!isStrongPassword(password)) {
      setError('Password must be at least 8 characters and include a letter and a number');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword: password,
      });
      toast.success('Password reset — you can now log in');
      navigate(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`, {
        replace: true,
      });
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <HiArrowLeft className="w-4 h-4" />
          Request a new code
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Reset password</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Enter the code we sent to your email and choose a new password.
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
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Input
          label="Reset code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
          maxLength={6}
          hint="6-digit code from your email"
          required
        />

        <div>
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            iconLeft={<HiLockClosed className="w-4 h-4" />}
            autoComplete="new-password"
            required
          />
          {strength && (
            <div className="mt-2">
              <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className={`h-full transition-all ${STRENGTH_COLORS[strength]}`}
                  style={{ width: STRENGTH_WIDTH[strength] }}
                />
              </div>
              <p className="text-xs mt-1 text-[var(--text-muted)]">
                Strength: <span className="text-[var(--text-secondary)]">{STRENGTH_LABELS[strength]}</span>
              </p>
            </div>
          )}
        </div>

        <Input
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          iconLeft={<HiLockClosed className="w-4 h-4" />}
          autoComplete="new-password"
          required
          error={confirm && password !== confirm ? 'Passwords do not match' : undefined}
        />

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Reset password
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
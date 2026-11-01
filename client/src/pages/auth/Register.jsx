import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button, Input, Checkbox } from '@/components/ui';
import { useLegalModal } from '@/components/public/LegalModal';
import { isValidEmail, isStrongPassword, isValidPhone } from '@/utils/validators';
import { parseApiError } from '@/utils/parseApiError';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { open: openLegal } = useLegalModal();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/app" replace />;

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('Enter your full name');
      return;
    }
    if (!isValidEmail(form.email)) {
      setError('Enter a valid email address');
      return;
    }
    if (form.phone && !isValidPhone(form.phone)) {
      setError('Enter a valid phone number');
      return;
    }
    if (!isStrongPassword(form.password)) {
      setError('Password must be at least 8 characters and include a letter and a number');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!agreed) {
      setError('Please accept the Terms and Privacy Policy to continue');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });

      toast.success('Account created — check your email for the verification code');
      navigate(
        `/verify?email=${encodeURIComponent(form.email.trim().toLowerCase())}`,
        { replace: true }
      );
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

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

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Create your account</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Free forever. No card required.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--danger-bg)] text-[var(--danger-text)] text-sm border border-[var(--danger-border)]">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Full name"
          value={form.name}
          onChange={(e) => patch('name', e.target.value)}
          placeholder="Your Name"
          autoComplete="name"
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => patch('email', e.target.value)}
          placeholder="Your Email"
          autoComplete="email"
          required
        />
        <Input
          label="Phone (optional)"
          type="tel"
          value={form.phone}
          onChange={(e) => patch('phone', e.target.value)}
          placeholder="Your Phone Number"
          hint="For SMS verification and meeting reminders"
          autoComplete="tel"
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => patch('password', e.target.value)}
          placeholder="Choose a password"
          hint="At least 8 characters, include a letter and a number"
          autoComplete="new-password"
          required
        />
        <Input
          label="Confirm password"
          type="password"
          value={form.confirm}
          onChange={(e) => patch('confirm', e.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
          required
        />

        <div className="pt-2">
          <Checkbox
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            id="agree-legal"
            label={
              <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => openLegal('terms')}
                  className="text-[var(--brand-primary)] underline hover:opacity-80"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => openLegal('privacy')}
                  className="text-[var(--brand-primary)] underline hover:opacity-80"
                >
                  Privacy Policy
                </button>
                .
              </span>
            }
          />
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={submitting}
          disabled={!agreed}
        >
          Create account
        </Button>
      </form>

      <p className="text-sm text-center mt-6 text-[var(--text-secondary)]">
        Already have an account?{' '}
        <Link to="/login" className="text-[var(--brand-primary)] font-medium hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
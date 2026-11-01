import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiArrowLeft,
  HiCheckCircle,
  HiOutlineEnvelope,
  HiOutlineDevicePhoneMobile,
} from 'react-icons/hi2';
import { Button, Input } from '@/components/ui';
import { authApi } from '@/api';
import { useToast } from '@/context/ToastContext';
import { parseApiError } from '@/utils/parseApiError';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const urlEmail = params.get('email') || '';
  const urlToken = params.get('token') || '';

  const [email, setEmail] = useState(urlEmail);
  const [code, setCode] = useState('');
  const [tab, setTab] = useState('email');
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Auto-verify by token when URL has ?token=...
  useEffect(() => {
    if (!urlToken) return;

    setVerifying(true);
    authApi
      .verifyByToken(urlToken)
      .then((res) => {
        const data = res?.data || res;
        const email = data?.email || urlEmail;
        setVerifiedEmail(email);
        setSuccess(true);
        toast.success('Account verified — you can now log in');
        setTimeout(
          () =>
            navigate(`/login?email=${encodeURIComponent(email)}`, {
              replace: true,
            }),
          1500
        );
      })
      .catch((err) => {
        setError(parseApiError(err).message);
      })
      .finally(() => setVerifying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerifyCode = async (ev) => {
    ev.preventDefault();
    setError('');
    if (!email.trim() || !code.trim()) {
      setError('Enter your email and the code sent to your phone');
      return;
    }
    setVerifying(true);
    try {
      const res = await authApi.verifyByCode({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      const data = res?.data || res;
      const verifiedEmailAddr = data?.email || email.trim().toLowerCase();
      setVerifiedEmail(verifiedEmailAddr);
      setSuccess(true);
      toast.success('Account verified — you can now log in');
      setTimeout(
        () =>
          navigate(`/login?email=${encodeURIComponent(verifiedEmailAddr)}`, {
            replace: true,
          }),
        1500
      );
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Enter your email first');
      return;
    }
    setResending(true);
    setError('');
    try {
      await authApi.resendVerification({ email: email.trim().toLowerCase() });
      toast.success('Verification sent — check your email and phone');
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setResending(false);
    }
  };

  // ─── Success ──────────────────────────────────────
  if (success) {
    return (
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--success-bg)] text-[var(--success-text)] mb-4">
          <HiCheckCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Email verified
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Your account is now active. Redirecting to login...
        </p>
        <Button
          to={`/login?email=${encodeURIComponent(verifiedEmail || email)}`}
          fullWidth
          size="lg"
        >
          Continue to login
        </Button>
      </div>
    );
  }

  // ─── Auto-verifying state ─────────────────────────
  if (verifying && urlToken) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bg-tertiary)] text-[var(--brand-primary)] mb-4">
          <HiOutlineEnvelope className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Verifying your email...
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Just a moment — activating your account.
        </p>
      </div>
    );
  }

  // ─── Form state (manual verification) ─────────────
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
          Verify your email
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Check your email for the verification link. Or switch to phone if you received a
          code by SMS.
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border-color)] mb-5">
        <button
          type="button"
          onClick={() => {
            setTab('email');
            setError('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'email'
              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <HiOutlineEnvelope className="w-4 h-4" />
          Email link
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('phone');
            setError('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'phone'
              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <HiOutlineDevicePhoneMobile className="w-4 h-4" />
          Phone code
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--danger-bg)] text-[var(--danger-text)] text-sm border border-[var(--danger-border)]">
          {error}
        </div>
      )}

      {/* ─── Email tab ─────────────────────────────── */}
      {tab === 'email' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <p className="text-sm text-[var(--text-primary)] font-medium mb-1">
              Check your email
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Open the email we sent you and click the <strong>Verify Email</strong> button.
              The link activates your account automatically — no code to type.
            </p>
          </div>

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your Email"
            autoComplete="email"
          />

          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={handleResend}
            loading={resending}
          >
            Resend verification email
          </Button>
        </div>
      )}

      {/* ─── Phone tab ─────────────────────────────── */}
      {tab === 'phone' && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <p className="text-sm text-[var(--text-primary)] font-medium mb-1">
              Check your phone
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              We sent a 6-digit code to your phone number. Enter it below along with your
              email to verify.
            </p>
          </div>

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your Email"
            autoComplete="email"
            required
          />
          <Input
            label="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit code"
            inputMode="numeric"
            maxLength={6}
            hint="The code from your SMS"
            required
          />

          <Button type="submit" fullWidth size="lg" loading={verifying}>
            Verify with code
          </Button>

          <Button
            type="button"
            variant="outline"
            fullWidth
            size="sm"
            onClick={handleResend}
            loading={resending}
          >
            Resend code
          </Button>
        </form>
      )}

      <p className="text-sm text-center mt-6 text-[var(--text-secondary)]">
        Already verified?{' '}
        <Link to="/login" className="text-[var(--brand-primary)] font-medium hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
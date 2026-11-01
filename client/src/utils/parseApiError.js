const MESSAGES = {
  TOKEN_EXPIRED: 'Session expired. Please log in again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACCOUNT_DISABLED: 'Your account has been disabled.',
  EMAIL_NOT_VERIFIED: 'Please verify your email first. A new code has been sent.',
  VALIDATION_001: 'Please check your input.',
  CONFLICT: 'This account already exists.',
  NOT_FOUND: 'Account not found.',
  FORBIDDEN: "You don't have access.",
  RATE_LIMITED: 'Too many attempts. Please wait a moment.',
  OTP_NOT_FOUND: 'No pending verification. Request a new code.',
  OTP_EXPIRED: 'Code expired. Request a new one.',
  OTP_INVALID: 'Invalid code. Please check and try again.',
  ALREADY_VERIFIED: 'Already verified.',
  INVALID_PASSWORD: 'Current password is incorrect.',
};

export function parseApiError(err) {
  if (!err) return { message: 'Something went wrong' };

  if (err.isNetwork) return { message: 'Network error. Check your connection.' };
  if (err.isServer) return { message: 'Server error. Please try again.' };

  const message =
    MESSAGES[err.code] ||
    (err.details && Array.isArray(err.details) && err.details[0]?.message) ||
    err.message ||
    'Something went wrong';

  return { message, code: err.code, status: err.status };
}
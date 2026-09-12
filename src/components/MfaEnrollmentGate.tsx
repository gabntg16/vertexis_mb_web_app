import React, { useEffect, useRef, useState } from 'react';
import {
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AlertCircle, LockKeyhole, Phone, ShieldCheck } from 'lucide-react';

export const MfaEnrollmentGate: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  const getEnrollmentErrorMessage = (enrollmentError: unknown, fallback: string) => {
    const code =
      enrollmentError && typeof enrollmentError === 'object' && 'code' in enrollmentError
        ? String(enrollmentError.code)
        : '';

    const messages: Record<string, string> = {
      'auth/internal-error-encountered':
        'Firebase could not start the SMS challenge. Enable Phone Authentication, add this site to Firebase Authorized domains, and retry.',
      'auth/operation-not-allowed':
        'Phone Authentication is disabled for this Firebase project. Enable it in Authentication > Sign-in method.',
      'auth/unauthorized-domain':
        'This site is not authorized for Firebase Authentication. Add its hostname in Authentication > Settings > Authorized domains.',
      'auth/captcha-check-failed':
        'reCAPTCHA was rejected. Disable ad blockers, complete the visible challenge, and try again.',
      'auth/quota-exceeded':
        'Firebase SMS quota has been exceeded. Wait before retrying or use a Firebase test phone number.',
      'auth/too-many-requests':
        'Too many SMS requests were made. Wait a few minutes before trying again.',
      'auth/invalid-phone-number':
        'Firebase rejected this phone number. Enter a real number in E.164 format, such as +639171234567.',
      'auth/requires-recent-login':
        'For security, sign out and sign in again before enrolling a phone number.',
    };

    if (messages[code]) return messages[code];
    return enrollmentError instanceof Error ? enrollmentError.message : fallback;
  };

  useEffect(() => {
    const user = auth.currentUser;
    setIsEnrolled(Boolean(user && multiFactor(user).enrolledFactors.length > 0));

    return () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
    };
  }, []);

  const getVerifier = () => {
    verifierRef.current?.clear();
    const verifier = new RecaptchaVerifier(auth, 'mfa-enrollment-recaptcha', {
      size: 'normal',
      callback: () => setError(null),
      'expired-callback': () => setError('The reCAPTCHA expired. Please complete it again.'),
    });
    verifierRef.current = verifier;
    return verifier;
  };

  const sendCode = async () => {
    const user = auth.currentUser;
    const normalizedPhone = phoneNumber.trim();
    if (!user) return;
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError('Enter a valid phone number in E.164 format, for example +639171234567.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const verifier = getVerifier();
      await verifier.render();
      const session = await multiFactor(user).getSession();
      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(
        { phoneNumber: normalizedPhone, session },
        verifier
      );
      setVerificationId(id);
    } catch (enrollmentError) {
      verifierRef.current?.clear();
      verifierRef.current = null;
      console.error('[MFA enrollment] SMS request failed:', enrollmentError);
      setError(getEnrollmentErrorMessage(enrollmentError, 'Unable to send the verification code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const enrollPhone = async (event: React.FormEvent) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user || !verificationId || !verificationCode.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode.trim());
      await multiFactor(user).enroll(
        PhoneMultiFactorGenerator.assertion(credential),
        'VertexIS sign-in phone'
      );
      verifierRef.current?.clear();
      verifierRef.current = null;
      setIsEnrolled(true);
    } catch (enrollmentError) {
      console.error('[MFA enrollment] Phone enrollment failed:', enrollmentError);
      setError(getEnrollmentErrorMessage(enrollmentError, 'Unable to enroll this phone number.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEnrolled) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-[#80C7F2]/15 p-2 text-[#1a7bb5]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Set up MFA</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-300">
              Add a phone number so future sign-ins can be verified securely.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!verificationId ? (
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
              Phone number
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="+639171234567"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-3 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-[#80C7F2] dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </label>
            <div id="mfa-enrollment-recaptcha" />
            <button
              type="button"
              onClick={sendCode}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F37021] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <LockKeyhole className="h-4 w-4" />
              {isSubmitting ? 'Sending code...' : 'Send verification code'}
            </button>
          </div>
        ) : (
          <form onSubmit={enrollPhone} className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
              SMS verification code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="123456"
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-[#80C7F2] dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#F37021] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Verify and enable MFA'}
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={isSubmitting}
              className="w-full py-2 text-sm font-semibold text-[#1a7bb5] disabled:opacity-50"
            >
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
import React, { useEffect, useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import {
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
} from 'firebase/auth';
import type { MultiFactorError, MultiFactorResolver } from 'firebase/auth';
import marshbitesLogo from '../assets/images/marshbites_logo.jpg';
import { Lock, Mail, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginWithFirebase, switchUser, themeMode } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const getAuthErrorMessage = (authError: unknown, fallback: string) => {
    const code =
      authError && typeof authError === 'object' && 'code' in authError
        ? String(authError.code)
        : '';

    if (code === 'auth/internal-error-encountered') {
      return 'Firebase could not start the MFA SMS challenge. Check that this domain is authorized in Firebase Authentication and that Phone/MFA sign-in is enabled, then try Resend MFA code.';
    }

    if (code === 'auth/operation-not-allowed') {
      return 'Email/password sign-in is disabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method.';
    }

    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      return 'The email or password is incorrect.';
    }

    if (code === 'auth/network-request-failed') {
      return 'Firebase could not be reached. Check your internet connection and try again.';
    }

    if (code === 'functions/not-found' || code === 'functions/unavailable') {
      return 'Firebase sign-in succeeded, but the VertexIS profile service is unavailable or this account is not linked to a profile. Deploy the Functions backend and provision the account, then try again.';
    }

    if (code === 'functions/failed-precondition') {
      return 'This Firebase account is missing an email address required by VertexIS. Ask an administrator to provision the account.';
    }

    return authError instanceof Error ? authError.message : fallback;
  };

  useEffect(() => () => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  }, []);

  const sendMfaCode = async (resolver: MultiFactorResolver) => {
    const phoneHint = resolver.hints.find(
      (hint) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID
    );
    if (!phoneHint) throw new Error('This account requires an unsupported MFA method.');

    recaptchaRef.current?.clear();
    recaptchaRef.current = null;

    const verifier = new RecaptchaVerifier(auth, 'mfa-recaptcha-container', {
      size: 'normal',
      callback: () => setError(null),
      'expired-callback': () => {
        setError('The reCAPTCHA challenge expired. Complete it again before requesting an MFA code.');
      },
    });
    recaptchaRef.current = verifier;

    const provider = new PhoneAuthProvider(auth);
    try {
      await verifier.render();
      const id = await provider.verifyPhoneNumber(
        {
          multiFactorHint: phoneHint,
          session: resolver.session,
        },
        verifier
      );
      setVerificationId(id);
      setMfaResolver(resolver);
    } catch (error) {
      verifier.clear();
      recaptchaRef.current = null;
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await loginWithFirebase(email, password);
    } catch (authError) {
      if (
        authError &&
        typeof authError === 'object' &&
        'code' in authError &&
        authError.code === 'auth/multi-factor-auth-required'
      ) {
        try {
          const resolver = getMultiFactorResolver(auth, authError as MultiFactorError);
          setMfaResolver(resolver);
          await sendMfaCode(resolver);
        } catch (mfaError) {
          setError(getAuthErrorMessage(mfaError, 'Unable to send the MFA code.'));
        }
      } else {
        setError(getAuthErrorMessage(authError, 'Invalid email or password.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !mfaResolver || !verificationId || !verificationCode.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode.trim());
      await mfaResolver.resolveSignIn(PhoneMultiFactorGenerator.assertion(credential));
      window.location.reload();
    } catch (mfaError) {
      setError(getAuthErrorMessage(mfaError, 'Invalid MFA code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendMfaCode = async () => {
    if (isSubmitting || !mfaResolver) return;

    setIsSubmitting(true);
    setError(null);
    setVerificationCode('');
    try {
      await sendMfaCode(mfaResolver);
    } catch (mfaError) {
      setError(getAuthErrorMessage(mfaError, 'Unable to resend the MFA code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`mallow-login-shell mallow-shell min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-colors ${
      themeMode === 'dark' ? 'bg-[#0e0e0e] text-white' : 'bg-[#F8F9FA] text-[#231F20]'
    }`}>
      <div className="w-full max-w-md space-y-6">
        {/* Brand Card */}
        <div className={`mallow-login-card mallow-panel rounded-[2rem] p-8 shadow-xl border text-center relative overflow-hidden transition-all ${
          themeMode === 'dark'
            ? 'bg-[#161616] border-neutral-800'
            : 'bg-white border-[#80C7F2]/25'
        }`}>
          {/* Subtle brand gradient background pill */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#80C7F2]/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-[#F37021]/15 blur-2xl pointer-events-none" />

          {/* Logo */}
          <div className="mx-auto w-24 h-24 rounded-3xl bg-white dark:bg-neutral-800 p-1.5 shadow-lg mb-4 flex items-center justify-center border border-neutral-200/90 dark:border-neutral-700 overflow-hidden">
            <img
              src={marshbitesLogo}
              alt="The Marsh Bites"
              className="w-full h-full object-cover rounded-2xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('marshbites_logo.jpg')) {
                  target.src = '/marshbites_logo.jpg';
                }
              }}
            />
          </div>

          <h1 className="text-2xl font-black tracking-tight">
            Vertex<span className="text-[#F37021]">IS</span>
          </h1>
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 mt-0.5">
            The Marsh Bites • Gourmet Marshmallows
          </p>
          <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#80C7F2]/10 text-xs font-semibold text-[#1a7bb5] dark:text-[#80C7F2] border border-[#80C7F2]/20">
            <Sparkles className="w-3.5 h-3.5 text-[#F37021]" />
            <span>Handmade Gourmet Marshmallows from Bicol</span>
          </div>

          <div id="mfa-recaptcha-container" />

          {/* Form */}
          {mfaResolver ? (
            <form onSubmit={handleMfaSubmit} className="mt-6 space-y-4 text-left">
              {error && (
                <div role="alert" className="flex items-center space-x-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label htmlFor="verification-code" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="verification-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  placeholder="Enter the SMS code"
                  className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                    themeMode === 'dark'
                      ? 'bg-neutral-900/80 border-neutral-700 text-white placeholder-neutral-500'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="mallow-button w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#F37021] to-amber-500 text-white font-bold text-sm shadow-md flex items-center justify-center space-x-2"
              >
                <span>{isSubmitting ? 'Please wait…' : 'Verify MFA Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResendMfaCode}
                disabled={isSubmitting}
                className="w-full py-2 text-sm font-semibold text-[#1a7bb5] dark:text-[#80C7F2] disabled:opacity-50"
              >
                {isSubmitting ? 'Sending code...' : 'Resend MFA code'}
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            {error && (
              <div role="alert" className="flex items-center space-x-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="login-email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@marshbites.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-neutral-900/80 border-neutral-700 text-white placeholder-neutral-500'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                  }`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] transition-colors ${
                    themeMode === 'dark'
                      ? 'bg-neutral-900/80 border-neutral-700 text-white placeholder-neutral-500'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-neutral-500 hover:text-[#F37021] dark:text-neutral-300 dark:hover:text-[#F37021] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" strokeWidth={2.25} />
                  ) : (
                    <Eye className="w-5 h-5" strokeWidth={2.25} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mallow-button w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#F37021] to-amber-500 text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center space-x-2"
            >
              <span>{isSubmitting ? 'Signing in…' : 'Sign In to System'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          )}

          {(import.meta.env.DEV || !isFirebaseConfigured) && (
            <div className="mt-7 border-t border-neutral-200 pt-5 text-left dark:border-neutral-800">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                Demo Accounts / Development shortcuts
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Local preview only. These buttons never ship in production builds.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ['u-super-admin', 'HQ Admin'],
                  ['u-legazpi-mgr', 'Legazpi Manager'],
                  ['u-legazpi-staff', 'Legazpi Staff'],
                  ['u-cabuyao-mgr', 'Cabuyao Manager'],
                ].map(([userId, label]) => (
                  <button
                    key={userId}
                    type="button"
                    onClick={() => {
                      switchUser(userId);
                      setError(null);
                    }}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-[#80C7F2] hover:bg-[#80C7F2]/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-neutral-400">
          VertexIS Branch Management System • Handcrafted in Bicol
        </p>
      </div>
    </div>
  );
};

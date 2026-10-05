import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X, ShieldCheck } from 'lucide-react';

export interface LogoutConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  userName?: string;
  userRole?: string;
  branchName?: string;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  open,
  onCancel,
  onConfirm,
  userName,
  userRole,
  branchName,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key press and prevent background scrolling while open
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open || !mounted || typeof document === 'undefined') {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onCancel}
      aria-hidden={!open}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-description"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md my-auto rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-neutral-700 dark:bg-[#1c1c1c] animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-2xl bg-rose-500/15 p-3 text-rose-600 dark:text-rose-400 shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h2 id="logout-confirm-title" className="text-base sm:text-lg font-black text-neutral-950 dark:text-white leading-tight">
                Sign out of VertexIS?
              </h2>
              <p id="logout-confirm-description" className="mt-1.5 text-xs sm:text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                {userName ? (
                  <>
                    Signing out will end the active session for <strong className="text-neutral-900 dark:text-neutral-200">{userName}</strong>. Any live Firestore listeners and local session states will be securely closed.
                  </>
                ) : (
                  'You will need to sign in again to access this workspace. All real-time connections will be securely closed.'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close sign out confirmation"
            className="rounded-xl p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {(userRole || branchName) && (
          <div className="mt-4 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between text-xs">
            {userRole && (
              <span className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-300">
                <ShieldCheck className="h-3.5 w-3.5 text-[#F37021]" />
                <span>{userRole}</span>
              </span>
            )}
            {branchName && (
              <span className="text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">
                {branchName}
              </span>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 text-sm font-bold text-neutral-600 dark:text-neutral-300 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-sign-out-btn"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-rose-700 active:scale-95 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Yes, Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default LogoutConfirmModal;


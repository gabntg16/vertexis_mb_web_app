import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PackageSelectionState } from '../../hooks/usePackageSelection';
import { analyzePackageUpgrade } from '../../hooks/usePackageUpgradeOptimization';
import { PACKAGE_TIERS, calculatePackagePrice } from '../../utils/packagePricing';

interface Props {
  pending: PackageSelectionState['pending'];
  onAction: (action: 'proceed' | 'stay' | 'keep' | 'upgrade' | 'cancel') => void;
  themeMode?: string;
}
const currency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

export function PackageDecisionModal({ pending, onAction, themeMode }: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const actionRef = useRef(onAction);
  actionRef.current = onAction;
  useEffect(() => {
    if (!pending) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        actionRef.current('cancel');
      }
      if (event.key === 'Tab') {
        const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [pending]);
  if (!pending || typeof document === 'undefined') return null;
  const tier = PACKAGE_TIERS.find(item => item.id === pending.tierId)!;
  const packs = Object.values(pending.quantities).reduce((sum, value) => sum + value, 0);
  const { totalPrice, excessPacks } = calculatePackagePrice(tier, packs);
  const nextTier = analyzePackageUpgrade(tier.id, pending.quantities).nextTier;
  const isUpgrade = pending.kind === 'upgrade';
  return createPortal(
    <div className={`${themeMode === 'dark' ? 'dark ' : ''}fixed inset-0 z-[100000] flex items-center justify-center bg-black/65 p-3 sm:p-6 backdrop-blur-sm`} onClick={event => event.stopPropagation()}>
      <div ref={dialog} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
        className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl border border-amber-200 bg-white p-4 sm:p-6 text-neutral-900 shadow-2xl outline-none dark:border-amber-700 dark:bg-neutral-900 dark:text-neutral-100">
        <button type="button" aria-label="Close message" onClick={() => onAction('cancel')} className="absolute top-3 right-3 rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-4 w-4" /></button>
        <h2 id={titleId} className="pr-8 text-lg font-bold">{isUpgrade ? '💡 Smart Upgrade Available' : 'Add Extra Packs?'}</h2>
        <div id={descriptionId} className="mt-3 space-y-3 text-sm leading-relaxed">
          {isUpgrade && nextTier ? <>
            <p>Your current total of <strong>{currency(totalPrice)}</strong> for <strong>{packs} packs</strong> is close to or higher than the <strong>{nextTier.name} Package</strong>. You can upgrade now to get more base packs for a better value!</p>
            <p className="rounded-xl bg-amber-50 p-3 text-amber-950 dark:bg-amber-950 dark:text-amber-100">Get {nextTier.baseCapacity} packs for {currency(nextTier.price)} and save <strong>{currency(Math.max(0, totalPrice - nextTier.price))}</strong>.</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Your selected flavors are preserved. Additional base packs go to your first selected flavor and can be adjusted.</p>
          </> : <>
            <p>You have reached the base pack limit for this tier. Would you like to proceed with adding extra packs (incurring an extra pack fee), or stay with the exact base package?</p>
            <p>{tier.name} includes <strong>{tier.baseCapacity} packs</strong>. Extra packs cost <strong>{currency(tier.extraPackRate)} each</strong>.</p>
            <p className="rounded-xl bg-amber-50 p-3 text-amber-950 dark:bg-amber-950 dark:text-amber-100">{packs} packs: {excessPacks} extra × {currency(tier.extraPackRate)}. Total: <strong>{currency(totalPrice)}</strong>.</p>
            {pending.attemptedTotal >= tier.maxCap && <p>This tier allows up to {tier.maxCap.toLocaleString()} packs. {pending.attemptedTotal > tier.maxCap ? `Your requested ${pending.attemptedTotal.toLocaleString()} packs will be limited to ${tier.maxCap.toLocaleString()}. ` : ''}{nextTier ? 'Proceed to review the next-tier upgrade option.' : 'You can keep this quantity or return to the base package.'}</p>}
          </>}
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={() => onAction(isUpgrade ? 'upgrade' : 'proceed')} className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700">{isUpgrade ? `Upgrade to ${nextTier?.name}` : 'Proceed with Extra Packs'}</button>
          <button type="button" onClick={() => onAction(isUpgrade ? 'keep' : 'stay')} className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">{isUpgrade ? 'Keep Current Selection' : 'Stay with Base Package'}</button>
        </div>
      </div>
    </div>, document.body,
  );
}

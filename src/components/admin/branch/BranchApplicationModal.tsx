import React, { useRef, useState } from 'react';
import { X, Store, CheckCircle2, AlertCircle, LoaderCircle } from 'lucide-react';
import { useData } from '../../../context/DataContext';

interface BranchApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BranchApplicationModal: React.FC<BranchApplicationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <BranchApplicationForm onClose={onClose} />;
};

function BranchApplicationForm({ onClose }: { onClose: () => void }) {
  const { submitBranchApplication, themeMode } = useData();
  const [branchName, setBranchName] = useState('');
  const [address, setAddress] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [businessType, setBusinessType] = useState('Franchise Kiosk');
  const [operatingHours, setOperatingHours] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const busy = useRef(false);
  const formClass = 'mt-1.5 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:ring-orange-950';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    if (![branchName, address, managerName, managerEmail, contactNumber].every(value => value.trim())) {
      setError('Please complete the five required fields.');
      return;
    }
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await submitBranchApplication({
        branchName: branchName.trim(), address: address.trim(),
        managerName: managerName.trim(), managerEmail: managerEmail.trim().toLowerCase(),
        contactNumber: contactNumber.trim(), managerPhone: contactNumber.trim(),
        email: managerEmail.trim().toLowerCase(), businessType,
        operatingHours: operatingHours.trim(), managerGovId: '', documents: [],
      });
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit the application. Please try again.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <div className={`${themeMode === 'dark' ? 'dark ' : ''}fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm`}>
      <section role="dialog" aria-modal="true" aria-labelledby="branch-application-title" className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-white" onKeyDown={event => { if (event.key === 'Escape' && !saving) onClose(); }}>
        <header className="flex items-center gap-3 border-b border-neutral-200 p-5 dark:border-neutral-700">
          <span className="rounded-xl bg-orange-50 p-2.5 text-orange-500 dark:bg-orange-950"><Store size={22} /></span>
          <div className="flex-1"><h2 id="branch-application-title" className="text-lg font-bold">New branch application</h2><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Add the basics. HQ will review your application.</p></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close application" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800"><X size={20} /></button>
        </header>
        {submitted ? (
          <div className="space-y-4 p-6 text-center">
            <CheckCircle2 size={42} className="mx-auto text-emerald-500" />
            <h3 className="text-lg font-bold">Application submitted</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400"><strong>{branchName}</strong> is ready for HQ review. Find it in the Branch Applications tab.</p>
            <button type="button" autoFocus onClick={onClose} className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="min-h-0 space-y-4 overflow-y-auto p-5">
            <fieldset disabled={saving} className="space-y-4">
              <label className="block text-sm font-semibold">Branch name <span className="text-orange-500">*</span><input autoFocus required maxLength={160} value={branchName} onChange={event => setBranchName(event.target.value)} placeholder="e.g. SM Legazpi" className={formClass} /></label>
              <label className="block text-sm font-semibold">Branch address <span className="text-orange-500">*</span><input required maxLength={500} value={address} onChange={event => setAddress(event.target.value)} placeholder="Street, mall or building, city" autoComplete="street-address" className={formClass} /></label>
              <label className="block text-sm font-semibold">Manager name <span className="text-orange-500">*</span><input required maxLength={100} value={managerName} onChange={event => setManagerName(event.target.value)} placeholder="Full name" autoComplete="name" className={formClass} /></label>
              <label className="block text-sm font-semibold">Manager email <span className="text-orange-500">*</span><input required type="email" maxLength={254} value={managerEmail} onChange={event => setManagerEmail(event.target.value)} placeholder="manager@example.com" autoComplete="email" className={formClass} /><span className="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">Used for the manager account when HQ approves the branch.</span></label>
              <label className="block text-sm font-semibold">Contact number <span className="text-orange-500">*</span><input required type="tel" maxLength={30} value={contactNumber} onChange={event => setContactNumber(event.target.value)} placeholder="09XX XXX XXXX" autoComplete="tel" className={formClass} /></label>
              <details className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                <summary className="cursor-pointer text-sm font-medium text-neutral-600 dark:text-neutral-300">Optional branch details</summary>
                <div className="mt-3 space-y-3">
                  <label className="block text-sm font-semibold">Business type<select value={businessType} onChange={event => setBusinessType(event.target.value)} className={formClass}>{['Franchise Kiosk', 'Mall Inline Store', 'Full Dine-In Branch', 'Food Hall Booth', 'Express Counter'].map(type => <option key={type}>{type}</option>)}</select></label>
                  <label className="block text-sm font-semibold">Operating hours<input maxLength={160} value={operatingHours} onChange={event => setOperatingHours(event.target.value)} placeholder="e.g. 10 AM - 9 PM" className={formClass} /></label>
                </div>
              </details>
            </fieldset>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">No document uploads are needed to submit this application.</p>
            {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</p>}
            <footer className="flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold disabled:opacity-40 dark:border-neutral-600">Cancel</button>
              <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60">{saving && <LoaderCircle size={18} className="animate-spin" />}{saving ? 'Submitting...' : 'Submit application'}</button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}

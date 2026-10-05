import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  FileText,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { isBranchManager, isSuperAdmin } from '../../utils/securityValidator';

export type SettingsSection = 'account_settings' | 'privacy_settings' | 'legal_terms';

interface SettingsPageProps {
  section: SettingsSection;
  onNavigateTab: (tab: string) => void;
}

const sectionMeta: Record<SettingsSection, { label: string; description: string }> = {
  account_settings: {
    label: 'Account Settings',
    description: 'Review your profile, role, and assigned operating scope.',
  },
  privacy_settings: {
    label: 'Privacy Settings',
    description: 'Control local preferences for notifications and workspace privacy.',
  },
  legal_terms: {
    label: 'Terms & Legal',
    description: 'Read the operating terms that govern use of VertexIS.',
  },
};

const settingsTabs: Array<{ id: SettingsSection; label: string; icon: React.ElementType }> = [
  { id: 'account_settings', label: 'Account Settings', icon: UserRound },
  { id: 'privacy_settings', label: 'Privacy Settings', icon: LockKeyhole },
  { id: 'legal_terms', label: 'Terms & Legal', icon: FileText },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ section, onNavigateTab }) => {
  const { currentUser, currentBranch } = useData();
  const [privacy, setPrivacy] = useState({
    announcementNotifications: true,
    rememberWorkspace: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vertexis-privacy-settings');
      if (stored) setPrivacy((current) => ({ ...current, ...JSON.parse(stored) }));
    } catch {
      // Keep the safe defaults when local storage is unavailable or malformed.
    }
  }, []);

  const updatePrivacy = (key: keyof typeof privacy) => {
    setPrivacy((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        localStorage.setItem('vertexis-privacy-settings', JSON.stringify(next));
      } catch {
        // The preference still applies for this session.
      }
      return next;
    });
  };

  const roleLabel = useMemo(() => {
    if (!currentUser) return 'Signed-in user';
    if (isSuperAdmin(currentUser)) return 'HQ Super Admin';
    if (isBranchManager(currentUser)) return 'Branch Manager';
    return 'Branch Staff';
  }, [currentUser]);

  if (!currentUser) return null;

  const meta = sectionMeta[section];
  const branchLabel = isSuperAdmin(currentUser)
    ? 'Legazpi Central Commissary HQ'
    : currentBranch?.name?.replace('Marsh Bites - ', '') || currentUser.branchName || 'Assigned branch';

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F37021]">Workspace settings</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
            {meta.label}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          <span>RBAC-protected workspace</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="mallow-panel h-fit rounded-2xl p-2" aria-label="Settings navigation">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === section;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigateTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[#80C7F2] text-neutral-950 shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                {active && <ChevronRight className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </nav>

        <div className="mallow-panel min-w-0 rounded-2xl p-4 sm:p-6">
          {section === 'account_settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-neutral-950 dark:text-white">Profile & access</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Your access is assigned by an administrator and follows the current RBAC policy.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard icon={UserRound} label="Full name" value={currentUser.name} />
                <InfoCard icon={Mail} label="Email address" value={currentUser.email} />
                <InfoCard icon={ShieldCheck} label="Assigned role" value={roleLabel} />
                <InfoCard icon={MapPin} label="Operating scope" value={branchLabel} />
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
                <p className="font-bold">Need an account change?</p>
                <p className="mt-1 text-sky-800/80 dark:text-sky-200/80">
                  Contact a Super Admin to update your name, role, branch assignment, or sign-in access.
                </p>
              </div>
            </div>
          )}

          {section === 'privacy_settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-neutral-950 dark:text-white">Privacy preferences</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  These preferences are saved to this browser and do not change your account permissions.
                </p>
              </div>

              <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                <PreferenceRow
                  title="Operational announcements"
                  description="Show branch bulletins, dispatch updates, and system notices in your notification center."
                  enabled={privacy.announcementNotifications}
                  onToggle={() => updatePrivacy('announcementNotifications')}
                />
                <PreferenceRow
                  title="Remember this workspace"
                  description="Keep your display preferences on this trusted browser between sessions."
                  enabled={privacy.rememberWorkspace}
                  onToggle={() => updatePrivacy('rememberWorkspace')}
                />
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Privacy preferences are device-specific. Never use a shared device for sensitive operations without signing out.</p>
              </div>
            </div>
          )}

          {section === 'legal_terms' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-neutral-950 dark:text-white">Terms & legal</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  The core rules for using VertexIS within the Marsh Bites commissary network.
                </p>
              </div>

              <div className="space-y-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                <LegalBlock title="Authorized use">
                  Use VertexIS only for approved Marsh Bites operations. Do not share credentials, bypass role controls, or use another person&apos;s account.
                </LegalBlock>
                <LegalBlock title="Operational records">
                  Inventory counts, sales, requisitions, payments, receiving records, and audit entries must be accurate and submitted through the assigned workflow.
                </LegalBlock>
                <LegalBlock title="Privacy & security">
                  Access is logged for operational accountability. Protect customer, branch, payment, and employee information and report suspected unauthorized access immediately.
                </LegalBlock>
                <LegalBlock title="Policy updates">
                  Administrators may update these operating terms as the commissary network, legal requirements, or security controls change.
                </LegalBlock>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <Check className="h-4 w-4 text-emerald-500" />
                Last reviewed by VertexIS Operations · September 2026
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const InfoCard: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    <p className="mt-2 break-words text-sm font-bold text-neutral-900 dark:text-white">{value}</p>
  </div>
);

const PreferenceRow: React.FC<{
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}> = ({ title, description, enabled, onToggle }) => (
  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="text-sm font-bold text-neutral-900 dark:text-white">{title}</p>
      <p className="mt-1 max-w-xl text-xs leading-5 text-neutral-500 dark:text-neutral-400">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? 'bg-[#F37021]' : 'bg-neutral-300 dark:bg-neutral-700'}`}
      title={`${enabled ? 'Disable' : 'Enable'} ${title}`}
    >
      <span
        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const LegalBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
    <h3 className="font-bold text-neutral-900 dark:text-white">{title}</h3>
    <p className="mt-1">{children}</p>
  </div>
);

export default SettingsPage;

# Firestore rules findings: cloud sync and inbound receiving

- Database: `projects/vertexis-mb/databases/marshbites-mbms-db`
- Edition/mode: Enterprise, Firestore Native, realtime updates enabled.
- Authentication: Firebase Auth custom claims use `role: admin` or `role: branch` plus `branchId`.
- Branch authorization additionally checks `users/{uid}`, `branch_accounts/{uid}`, and `branches/{branchId}`.
- Client realtime queries use `where('branchId', '==', claimBranchId)` for branch-scoped collections.
- `daily_shift_logs` and `inbound_receipts` are browser-readable only within the authenticated branch. All mutations are callable-only.
- Shift writes use `shiftCommands.ts`; receiving submit/review uses `inboundReceiving.ts`.
- The local rules allow the actual scoped `daily_shift_logs` query and deny unscoped/cross-branch reads. The production error is consistent with undeployed/stale rules.
- Receiving Functions existed in source but were absent from the deployed function list.
- Default-deny remains in place; this fix does not broaden write access.

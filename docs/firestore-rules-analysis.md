# Firestore rules analysis

This is an implementation note for the prototype claim-based rules. It is intentionally kept in the working tree as an untracked review artifact until the owner verifies the production data model.

## Collections used by the React client

| Collection | Access shape | Branch scope |
| --- | --- | --- |
| `users` | Authenticated profile lookup; HQ administration list/update | Admin only, except a user reads their own UID document |
| `branches` | HQ list; branch session reads its own branch | `id == request.auth.token.branchId` for branch users |
| `products` | Catalog and pricing | Global catalog; writes are admin-only |
| `orders` | Requisitions and order status changes | `branchId` |
| `deliveries` | Dispatch and receiving workflow | `branchId` |
| `receivings` | Inbound inspections | `branchId` |
| `inventory` | Stock balances and adjustments | `branchId` |
| `sales` | POS/manual sales records | `branchId` |
| `announcements` | Global notices | Global read; admin writes |
| `events` | Global calendar | Global read; admin writes |
| `production_batches` | Commissary production workflow | Admin only for now; records may contain `targetBranchId` in a future schema |
| `branch_applications` | Franchise applications and PII documents | Admin only |
| `branch_documents` | Compliance files and metadata | Admin or matching `branchId` |
| `branch_accounts` | Branch personnel metadata; never passwords | Admin or matching `branchId` |
| `branch_status_history` | Append-only branch lifecycle history | Admin or matching `branchId` |
| `branch_audit_logs` | Append-only branch audit trail | Admin or matching `branchId` |
| `birReceipts` | POS tax receipt register | `branchId` |
| `inventoryMovements` | Append-only stock movement history | `branchId` |
| `posAuditLogs` | Append-only POS audit history | `branchId` |
| `shiftClosings` | Z-reading/shift close records | `branchId` |
| `spoilage_records` | Wastage records | `branchId` |
| `physical_audits` | Physical stock audit records | `branchId` |
| `system_sync/status` | Seed/connection marker | Admin-only server/client maintenance |

The client also writes the legacy collection name `branchAuditLogs` in one audit path. That path should be migrated to `branch_audit_logs` before production use; the rules intentionally do not grant it a broad fallback permission.

## Query inventory

- The browser previously subscribed to whole collections. `firestoreSync.subscribeAll` now uses equality queries on `branchId` for branch-scoped collections and `id == branchId` for `branches`.
- Global catalog, notices, and calendar subscriptions remain collection reads.
- HQ administration may list the full administrative collections.
- The callable `resolveMyProfile` uses a server-side legacy migration query: `users where email == authenticated email limit 1`. This query is not exposed to the browser.
- There are no browser `orderBy` or `limit` queries in `src` at present.

## Data-model assumptions to verify

1. Every branch-scoped document has a non-empty string `branchId` matching the branch document ID.
2. New Auth profile documents use the Firebase Auth UID as the Firestore document ID and have `firebaseUid == document ID`.
3. Custom claims are `{ role: 'admin' }` for HQ or `{ role: 'branch', branchId: '<branch id>' }` for branch users.
4. Status history, inventory movements, POS audit logs, and shift closings are append-only from the client; correction workflows create a new compensating record.
5. Compliance documents and application records can contain sensitive personal information and must not be readable by branch users unless the document has been explicitly assigned to that branch.

## Adversarial review checklist

- Unauthenticated reads/writes: denied by default.
- Branch user listing another branch with an unfiltered query: denied; the client now issues a branch equality query.
- Branch user changing `branchId` during update: denied by immutable branch-scope validation.
- Branch user changing role/custom-claim-like fields in a profile: denied; claims are server-managed.
- Client deleting audit/history records: denied; only append/create is allowed for history collections.
- Client adding arbitrary fields or oversized strings: denied by schema and size validation in the prototype rules.
- Admin-only provisioning from the browser: denied; account creation is routed through the callable backend.

The rules are a prototype pending emulator coverage and owner review of all fields written by the current legacy client.

Validation status: `firebase deploy --only firestore:rules --dry-run --non-interactive --project vertexis-mb` completed successfully and reported that `firestore.rules` compiled. No Firebase deployment was performed.

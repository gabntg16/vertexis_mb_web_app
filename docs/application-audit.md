# VertexIS implementation audit — 29 September 2026

Changes are implemented in the existing application. No production deployment, account change, or real-data migration was performed. This is a targeted audit, not a certification that every workflow is secure or error-free.

## Confirmed business rules

- HQ must verify payment before production can start. Production cannot fabricate a successful payment or payment proof.
- Package totals use the existing Silver, Gold and Platinum configuration, not catalog wholesale prices.
- Dispatch sends the full requisition. Receipt approval records actual usable quantities; damaged packs do not increase available stock.
- Only the branch manager approves receiving requests for that branch. Stock is credited once, in the same transaction as receipt and shipment updates.
- Previously displayed collection accounts were not approved accounts and have been removed. HQ must supply approved payment instructions.

## Implemented changes

Sensitive cloud actions now use authenticated callable Functions with role/branch checks, server-side validation, transactional writes, and an immutable transaction audit. Order pricing and sale prices are calculated from authoritative configuration/catalog records. Sale stock deductions reject overselling; repeated transaction requests reuse an idempotency key and cannot apply twice. Receiving approval rejects stale revisions, duplicate credits, invalid stock and cross-branch requests.

Payment proofs are stored privately and read through an authorized callable. Uploads are limited to JPEG, PNG and WebP with size and signature checks. Approval checks the inspected proof revision. Unverified orders cannot enter production. Dispatch validates every ordered quantity and prevents duplicate active shipments. Closed orders are archived rather than deleted. Pricing changes are validated and audited without rewriting historical totals.

Cloud shift logs are shared across devices, branch-scoped, revision-checked and locked after approval. Cloud sessions no longer silently use demo records or report local-only writes as successful cloud transactions. Identity changes clear in-memory data. The legacy unauthenticated chat endpoint is disabled; the assistant uses a rate-limited authenticated callable without database or tool access.

Navigation, common loading/error states, payment forms, stock counts, requisition inspection/export and dispatch feedback were refined. Forecasts distinguish estimates from actual sales, exclude voided/refunded sales, and show insufficient-data states rather than invented risk percentages. Local HMR uses the application HTTP port instead of a separate port 24678.

## Verification

- Application type check and ESLint passed after fixing the asynchronous pricing save handler.
- Functions TypeScript build passed.
- Production Vite build passed; the largest application entry chunk is approximately 487 KB before gzip, with Firebase and spreadsheet code split into separate chunks.
- 70 automated tests passed; the seven emulator-dependent tests are intentionally skipped in the ordinary test command.
- Seven additional Firestore emulator checks passed: scoped reads, unauthorized writes, inactive users, proof restrictions, and actual concurrent stock transactions. Two competing sales cannot oversell; retrying a committed sale does not deduct again.
- Handler tests exercise malformed inputs, role/branch restrictions, stale approvals, duplicate submissions, transaction rollback and uncertain-response retries. Spreadsheet export tests cover generated results.
- Local HTTP smoke checks returned 200 for the application, Vite client and pricing component; the disabled public chat endpoint returned 410. HMR started on the application port without a port-24678 conflict. Browser rendering, keyboard interaction and mobile layouts have not been manually verified because no browser was connected.
- Root dependency audit reports zero known vulnerabilities. The Functions dependency audit retains two moderate findings in the transitive gaxios/uuid chain; no incompatible forced override was applied. See the checked-in dependency audit reports and [upstream advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

The emulator uses a local default database. It does not establish production parity for the existing Enterprise Native named database. Local builds ran on Node 24; Functions are configured for Node 22 and require staging validation on that runtime.

## Before rollout

1. Back up existing data and review the changed rules and callable workflows in staging. Deploy compatible Functions, Firestore rules and frontend together. Nothing here was deployed automatically.
2. Check custom claims, active `users/{uid}` profiles, matching `branch_accounts/{uid}` records and branch IDs/statuses. Legacy identity records may need migration before users can access the hardened services.
3. Migrate legacy inline payment proofs out of readable order documents. New proofs are private, but rules cannot hide individual fields in old documents. Existing approvals without verifiable payment metadata need deliberate review/re-upload, not automatically manufactured verification.
4. Supply approved collection instructions. Configure the assistant secret/model if using it. Enable App Check enforcement only after provisioning compatible client configuration and validating legitimate clients.
5. Review legacy global announcements/events missing scope fields and existing local-only drafts. No automatic deletion or migration was performed. The default-deny `storage.rules` file is a prototype and is deliberately not wired into deployment until existing bucket usage is reviewed.
6. Test live sign-in, role changes, payment upload/review, full dispatch and branch receiving with separate staff/manager/HQ accounts, including interrupted requests. Account claims and Firestore cannot be updated in one transaction; role management uses compensation on failure and still needs deployed identity-provider testing.

## Remaining scope and exact business question

**When a manager approves a daily shift log, should waste reduce inventory, should the closing physical count replace inventory, or should approval only lock the log?** Until clarified, approval preserves the existing log-only behavior and does not adjust stock. Receiving approval does credit inventory independently.

Legacy cloud paths for manual POS adjustments, refunds/voids, count reconciliation, stock allocation and manual production records are explicitly blocked where they have not been moved to validated backend commands. Their local/demo paths remain. These require dedicated workflows and policy verification before claiming full transaction coverage.

Additional review remains for broad admin metadata validators, collection-history pagination, comprehensive abuse/load testing, full image decoding/malware scanning and existing sensitive records. Upload signature checks are not malware scanning. The rules assessment is in [security-rules-audit.json](security-rules-audit.json).

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for branch-scoped access and server-validated transactions, while denying direct client changes to payments, stock, and approvals. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

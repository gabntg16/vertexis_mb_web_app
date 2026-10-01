# Inbound receiving rules review

Existing app: React/TypeScript, Firebase Auth role/branch claims, named Enterprise Native database marshbites-mbms-db. Existing collection access and business operations remain unchanged.

The only new collection is inbound_receipts. Its schema is InboundReceipt in functions/src/inboundReceivingModel.ts: required id/branchId/manifest/source, validated item array, status, submitter, timestamp and revision; optional delivery/order links and manager review/stock application metadata. Quantities are nonnegative integers; damaged lines contribute zero available units. All writes use authenticated callable Functions. Both submission and review validate branch membership against a trusted branch_accounts/{uid}, requiring an active Branch Manager for reviews.

Query scan: existing subscription queries use branchId equality, except branches use id equality. Admin subscriptions are unfiltered. The new receipt subscription uses the same branchId equality and requires real-time updates across staff/manager devices. Trusted Functions use transactional branch inventory and delivery queries and deliveryId receipt lookups for duplicate protection. Existing user migration queries email with limit(1). No new browser orderBy/limit requirements.

Rules change: read by admin or same-branch authenticated user, no browser create/update/delete. Full schema validation occurs in Functions, since every client write is denied. Stock, movement, receipt approval and linked delivery/order state are committed together. Existing broad inventory permissions are not a complete security hardening of the application.


## Transaction audit extension
- `transaction_requests/{uid}-{requestId}` and `transaction_audit/{uid}-{requestId}`: callable-only, immutable request digest/result and actor/time. No direct client access to retry journals; audit reads scoped to branch/HQ.
- `payment_proofs/{orderId}`: callable-only image bytes, branchId, uploader/time/revision; manager own branch or HQ through getPaymentProof. Legacy order-embedded proofs need a deliberate migration; never silently delete financial evidence.
- Orders, sales, inventory movements are written by transactional command handlers. Direct branch writes must be denied. Inventory browser creates restricted to HQ zero-stock initialization; all stock adjustments require a server command.
- Production start/stage and shipment create/status/cancel command handlers verify HQ, current statuses and verified payment.
- Branch announcement queries require nationwide/global or exact targetBranchId; event queries require branchId ALL or own branch. Existing global events without branchId need explicit migration.
- Active profiles/accounts checked in backend and rules. No browser role/profile writes.
- Existing legacy POS, waste/count reconciliation paths require follow-up migration before exposing them in cloud workflows. Denied operations must never fall back to local success.

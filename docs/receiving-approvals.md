# Receiving approvals

Staff open **Inbound Receiving**, choose an incoming shipment (or enter a unique manifest for a supplier delivery), enter actual quantities, and select **Request Receiving Approval**. Submission does not change inventory.

Branch managers open **Inbound Deliveries** or **Staff & Receiving Approvals**, inspect the product quantities and stock preview, then approve or return with a reason. Approval adds actual accepted quantities to existing Current Stock. Damaged lines add zero available packs; split usable and damaged packs into separate lines. Returned receipts can be corrected and resubmitted from the staff screen.

Approval creates a stock movement and completes the linked delivery/order in the same database transaction. A receipt revision can be approved only once. Older already-received deliveries cannot be credited again. Shift-log approval is separate and does not add stock a second time.

## Local and cloud testing

See [the application audit](application-audit.md) for deployment prerequisites, legacy-data migration, verification evidence and remaining limitations. Functions now target Node 22. Receiving submissions and decisions create server-authored transaction audit entries and are rate-limited. Active user profiles, claims, branch accounts and branch status must agree.

- In the app's existing Local mode, requests and stock changes are cached in the same browser. Use staff and manager accounts for the same branch. Separate browsers/devices require Firebase.
- Cloud mode uses the existing `marshbites-mbms-db` database and authenticated callable Functions. An active `branch_accounts/{Firebase UID}` record is required; only its `Branch Manager` role may approve. Profiles resolve their navigation role from that record.
- Deploy the updated Functions and Firestore rules before testing this workflow with Firebase accounts: `firebase deploy --only functions,firestore:rules`. This code change does not deploy them automatically.
- Standard Firestore queries are retained because the approval queue requires live updates across staff/manager devices, and stock changes require transactions.

Automated handler tests cover quantity validation, returned revisions, branch/role checks, damaged packs, existing and missing stock rows, duplicate approvals, legacy received deliveries, and failed-transaction rollback. They use an in-memory transaction adapter; they do not replace a Firebase emulator or deployed end-to-end check.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for receiving requests by restricting reads to the assigned branch or an admin and denying direct browser writes. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

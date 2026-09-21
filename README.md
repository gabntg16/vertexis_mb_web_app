# VertexIS Management System

VertexIS is The Marsh Bites’ internal web platform for the Legazpi City commissary and franchise branches. It combines branch requisitions, commissary production, dispatch and receiving, inventory controls, announcements, analytics, and a BIR-oriented point-of-sale workflow.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS and Lucide React
- Firebase Authentication and Cloud Firestore
- Firebase callable Functions for account provisioning and role claims
- Vitest for unit and integration-oriented tests

## Repository layout

```text
src/
  components/   Admin, branch, POS, safeguards, and shared UI
  context/      Application state and domain actions
  data/         Development seed data and fixtures
  services/     Firestore synchronization, account provisioning, and logistics
  types/        Shared TypeScript domain models
  utils/        RBAC, validation, forecasting, and idempotency helpers
functions/      Trusted Firebase account-provisioning backend
public/         Static hosting assets
firestore.rules Claim-based prototype rules
```

## Local setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and fill it with the Firebase web-app configuration for the intended project.
3. Install dependencies and start the Vite server:

```bash
npm install
npm run dev
```

The dev server uses port `3000` by default. Never commit `.env.local`; Firebase web configuration should still be treated as project configuration and protected with Authentication, App Check, and restrictive Firestore rules.

## Verification commands

```bash
npm run typecheck   # TypeScript project references
npm run lint        # ESLint
npm test            # Vitest
npm run build       # Typecheck followed by Vite production build
```

The Functions workspace has its own install/build cycle:

```bash
cd functions
npm install
npm run build
```

## Authentication and authorization

The browser uses Firebase email/password sign-in. It does not create users, store passwords, or assign security roles. The `functions/src/index.ts` callable backend provisions Auth users, writes a password-reset link workflow, creates the profile document, and assigns custom claims:

- `{ role: "admin" }` for headquarters users
- `{ role: "branch", branchId: "..." }` for branch users

Enable Email/Password in Firebase Authentication before testing sign-in. Deploy the Functions backend before using the admin account-management screen. After changing claims, sign out and back in (or refresh the ID token) so the new claim is active.

`firestore.rules` is a prototype claim-based ruleset. It defaults to deny, scopes branch queries by `branchId`, blocks browser access to passwords and user profile writes, and keeps sales/audit/status-history records append-only. Review it against the live schema and run emulator tests before deploying it to a shared project.

## Firebase project notes

- Firestore database: `marshbites-mbms-db`
- Region: `asia-southeast1`
- Hosting output: `dist/`

The current workspace contains no Flutter project directory. If a mobile companion is reintroduced, keep it as a separately reviewed application with its own Auth, rules, release, and maintenance plan; do not delete or merge an existing mobile project without the owner’s approval.

## Data and location assumptions

Development fixtures use the Legazpi City commissary as headquarters and include sample branches. Replace fixture data with managed records before production use. Verify branch IDs, roles, tax settings, and document-retention requirements with the business owner before sharing the app outside the development team.

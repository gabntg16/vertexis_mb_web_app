# Firebase Auth migration checklist

The repository now contains the client and trusted-backend pieces of the migration. The project owner still needs to complete the Firebase-console steps against the intended project.

1. In Firebase Console → Authentication → Sign-in method, enable Email/Password. Keep anonymous and provider methods disabled unless the product owner explicitly needs them.
2. Install and build `functions/`, then deploy the Functions code to `asia-southeast1`. Do not deploy Firestore rules until the callable provisioner is live and tested.
3. Create or migrate the first HQ administrator using a trusted Admin SDK environment. Assign `{ role: "admin" }` as a custom claim, then sign in once to verify `resolveMyProfile`.
4. Use the Admin User Management screen or the `provisionUser` callable for new accounts. It creates the Auth user and profile, applies `{ role: "branch", branchId }` for branch accounts, and returns a one-time password-reset link without persisting a password.
5. Run Firestore emulator tests for unauthenticated access, cross-branch reads/writes, user-profile writes, oversized fields, and deletion of append-only records. The rules compiler dry-run is already passing, but it is not a substitute for emulator assertions.
6. Rotate any Firebase web API key that appeared in an exposed or shared `.env.local`/build artifact. Update the local ignored `.env.local` only after the new key is issued; no secret is present in the repository or `.env.example`.
7. Force-refresh Auth ID tokens after a role change by signing out/in before testing branch boundaries.

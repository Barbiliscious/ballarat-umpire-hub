

## Plan: Convert umpire login to magic link flow

### Problem

The current umpire login uses `signInWithOtp` which sends a magic link email, but the UI expects a 6-digit code entry. When the umpire clicks the magic link, they land back on the app but nothing handles the automatic sign-in from the URL token — so they see the code entry form instead of being signed in.

### Solution

Convert `UmpireLogin.tsx` to a simple magic link flow:

1. **Step 1 (email)**: Umpire enters email → calls `signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/umpire/vote' } })`
2. **Step 2 (waiting)**: Show a "Check your email" message with a mail icon. No code input. Just a "Use a different email" button.
3. **Auth callback handling**: The Supabase client's `onAuthStateChange` in `auth.tsx` already handles the session from the URL hash automatically. When the magic link redirects to `/umpire/vote`, the auth state picks up the session and the user is signed in.

### Changes

| File | Change |
|------|--------|
| `src/pages/UmpireLogin.tsx` | Remove OTP verification step. Replace with "check your email" screen. Add `emailRedirectTo` to the `signInWithOtp` call. Remove `KeyRound` import and OTP state. |

No new files or routes needed — the redirect goes straight to `/umpire/vote` which already checks auth state.


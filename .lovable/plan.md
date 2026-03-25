

## Plan: Security fixes, account disable/enable, and unified umpire login flow

### 1. Delete `setup-super-admin` edge function

The function has hardcoded credentials and no auth check. Since the super admin account already exists, delete `supabase/functions/setup-super-admin/index.ts` entirely.

### 2. Add `is_disabled` column to `profiles`

Database migration to add:
```sql
ALTER TABLE public.profiles ADD COLUMN is_disabled boolean NOT NULL DEFAULT false;
```

Update the auth context (`src/lib/auth.tsx`) to check `is_disabled` on login — if true, sign out and show an error.

### 3. Block super_admin creation/deletion in the edge function

Update `admin-manage-users/index.ts`:
- Remove `super_admin` from allowed `create_user` roles entirely (nobody can create super_admin via the app)
- Remove ability to delete super_admin accounts
- Add a new `disable_user` action that sets `profiles.is_disabled = true/false`
- Add a new `enable_user` action

### 4. Update ManageUsers UI

- Remove `super_admin` from the role dropdown entirely
- Replace delete button with a disable/enable toggle for all non-super-admin users
- Super admin rows show no actions (cannot be removed or disabled)
- Show disabled status with a visual indicator (badge or muted row)

### 5. Fix audit_log RLS

Migration to tighten the INSERT policy:
```sql
DROP POLICY "Authenticated can insert audit log" ON public.audit_log;
CREATE POLICY "Admins can insert audit log" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (has_admin_access(auth.uid()));
```

### 6. Redesign Umpire Login (`UmpireLogin.tsx`)

New multi-step flow:

**Step 1 — Email entry**: Email input + "Continue" button.

**Step 2 — Check if account exists** (call a new edge function `check-umpire-email`):
- Edge function looks up `auth.users` by email using service role. Returns `{ exists: boolean }`.

**Step 3a — Account exists**: Show password input + "Sign in" button, plus two links: "Forgot password" and "Send me a one-time link instead". Password login uses `signInWithPassword()`. Magic link uses `signInWithOtp()`.

**Step 3b — Account does not exist (signup)**: Show:
- Full name input (mandatory)
- Password + Confirm password inputs
- OR a "Send me a one-time link instead" button
- "Create account" button calls the `check-umpire-email` edge function with `action: "create"` which creates the user via admin API with umpire role

### 7. New edge function: `check-umpire-email`

Actions:
- `check`: Takes email, returns `{ exists: boolean }`
- `create`: Takes email, password, full_name — creates user with `email_confirm: true`, assigns umpire role, creates profile

### 8. Auth context login guard

In `src/lib/auth.tsx`, after session is established, check if `profiles.is_disabled === true`. If so, call `signOut()` and show a toast: "Your account has been disabled. Contact an administrator."

### Files summary

| File | Change |
|------|--------|
| `supabase/functions/setup-super-admin/` | **Delete** |
| `supabase/functions/check-umpire-email/index.ts` | **New** — check existence, create umpire accounts |
| `supabase/functions/admin-manage-users/index.ts` | Remove super_admin creation, add disable/enable actions |
| `src/pages/UmpireLogin.tsx` | Complete rewrite — multi-step email/password/signup flow |
| `src/pages/admin/ManageUsers.tsx` | Remove super_admin option, add disable/enable toggle |
| `src/lib/auth.tsx` | Add `is_disabled` check on login |
| Migration SQL | Add `is_disabled` to profiles, fix audit_log RLS |


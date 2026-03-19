

## Plan: Role hierarchy, vote approval workflow, soft-delete, and admin-submitted votes

This is a significant feature set touching the role system, database schema, auth context, and multiple UI pages.

---

### 1. Database changes (migration)

**Expand the `app_role` enum** to add `super_admin`:
```sql
ALTER TYPE public.app_role ADD VALUE 'super_admin';
```

**Add columns to `vote_submissions`**:
- `is_approved` (boolean, default false) -- votes require admin approval
- `is_deleted` (boolean, default false) -- soft delete
- `deleted_by` (uuid, nullable) -- who deleted it
- `deleted_at` (timestamptz, nullable)
- `submitted_by_admin_id` (uuid, nullable) -- if an admin submitted on behalf of an umpire
- `submitted_by_admin_name` (text, nullable) -- display name of the admin who submitted

**Remove UPDATE RLS on `vote_lines`** for admins (votes cannot be edited). Remove the edit functionality from the Submissions page. Keep only approve/delete/lock actions.

**Update RLS policies**:
- `has_role` function already works with the enum; `super_admin` will need equivalent access to `admin` everywhere. Update policies to allow both `admin` and `super_admin` using an `OR` condition or a helper function like `has_admin_access()`.

**Create the super admin account** using an Edge Function that calls `auth.admin.createUser()` with email `mullaneaa@gmail.com` and a generated password (e.g. `BHA-Admin-2026!`), then inserts `super_admin` role.

---

### 2. Auth context updates (`src/lib/auth.tsx`)

- Add `isSuperAdmin` boolean to the context
- Check for both `admin` and `super_admin` roles
- `isAdmin` returns true for both admin and super_admin (backward compat)
- `isSuperAdmin` returns true only for super_admin

---

### 3. Admin invite system

**New page or section in ManageUsers**:
- Super admins can invite new admins (create user with email/password via Edge Function, assign `admin` role)
- Admins can also invite other admins
- OTP/umpire users cannot access admin features (already enforced)

**Edge Function `admin-manage-users`**:
- Create user via `supabase.auth.admin.createUser()`
- Assign role
- Only callable by authenticated admin/super_admin (verify role server-side)

---

### 4. Password change

Add a "Change Password" option in the admin layout (settings or profile dropdown) that calls `supabase.auth.updateUser({ password })`.

---

### 5. Vote approval workflow

**Submissions page changes**:
- Show `Pending` / `Approved` badge instead of just `Open` / `Locked`
- Add "Approve" button for admins
- Remove the "Edit" button entirely (no vote editing allowed)
- Votes default to `is_approved: false` on submission

**Dashboard changes**:
- Show pending vs approved counts
- Show recent submissions needing approval

---

### 6. Soft-delete with toggle

**Submissions page**:
- Replace hard-delete with soft-delete (set `is_deleted = true`, `deleted_by`, `deleted_at`)
- Add a toggle "Show deleted" that reveals soft-deleted submissions in a muted/strikethrough style with the deletor's name displayed
- Default view hides deleted submissions

---

### 7. Admin-submitted votes

**New feature in admin dashboard** -- "Submit Vote on Behalf of Umpire":
- Admin selects an umpire from dropdown, then fills the same vote form (round, division, fixture, 3-2-1 votes)
- Submission is saved with `submitted_by_admin_id` and `submitted_by_admin_name` populated
- In the submissions table, these rows display in a distinct color (e.g. amber/yellow background) with text "Submitted by: [Admin Name]"

---

### 8. Files to create/modify

| File | Change |
|------|--------|
| Migration SQL | Add `super_admin` to enum, add columns to `vote_submissions`, update RLS |
| Edge Function `admin-manage-users/index.ts` | Create users, assign roles, change passwords |
| `src/lib/auth.tsx` | Add `isSuperAdmin`, update `checkAdmin` |
| `src/components/AdminLayout.tsx` | Add "Change Password" option |
| `src/pages/admin/Submissions.tsx` | Remove edit, add approve/delete/show-deleted toggle, highlight admin-submitted |
| `src/pages/admin/ManageUsers.tsx` | Add invite admin form |
| `src/pages/admin/Dashboard.tsx` | Show pending/approved stats |
| `src/pages/admin/AdminVoteSubmit.tsx` | New page for admin to submit votes on behalf of umpire |
| `src/App.tsx` | Add route for admin vote submission |

---

### Technical details

- **Generated password**: `BHA-Admin-2026!` for `mullaneaa@gmail.com` (super_admin). User can change it immediately via the Change Password feature.
- The Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` (already configured) to call admin auth APIs.
- `has_admin_access` helper: `has_role(uid, 'admin') OR has_role(uid, 'super_admin')` used in all RLS policies.
- Vote lines UPDATE policy for admins will be dropped to prevent vote manipulation.


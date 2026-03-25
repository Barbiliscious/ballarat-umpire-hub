

## Plan: Umpire name collection, umpire management, and date validation

### 1. First-time umpire name prompt

When an umpire lands on `/umpire/vote` after magic link sign-in, check if their profile has a `full_name`. If not, show a modal/screen asking for their name before they can proceed. Save it to the `profiles` table. On subsequent logins, skip this step.

**Files:** `src/pages/UmpireVote.tsx`
- Add a state check: fetch profile by `user_id`, if `full_name` is null/empty, show a name entry form
- On submit, update `profiles.full_name` and proceed to voting

### 2. Admin umpire list and management

Add a new admin page for managing umpires, accessible from the sidebar.

**New file:** `src/pages/admin/ManageUmpires.tsx`
- List all profiles with the `umpire` role (join `profiles` with `user_roles`)
- Show name, email, first/last login
- Allow admins to edit an umpire's name inline
- Allow admins to create "email-less" umpire profiles (name only, no auth account) for admin-submitted votes — insert directly into `profiles` table with a generated UUID as `user_id` and no corresponding auth user

**Modified files:**
- `src/components/AdminLayout.tsx` — add "Umpires" nav item
- `src/App.tsx` — add `/admin/umpires` route

**Database:** Add an `UPDATE` policy on `profiles` for admins (currently admins can only view, not update other profiles). Migration:
```sql
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));
```

Also add an admin INSERT policy on profiles so admins can create umpire-only profiles:
```sql
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (has_admin_access(auth.uid()));
```

### 3. Vote date validation

Prevent umpires from submitting votes before the match date. In the `validate()` function in `UmpireVote.tsx`:
- If a fixture is selected, fetch its `match_date`
- If `match_date` exists and is in the future, block submission with error "Votes cannot be submitted before the match date"
- Load `match_date` when fixtures are fetched (already selecting `*`)

**File:** `src/pages/UmpireVote.tsx`
- Update `Fixture` interface to include `match_date`
- Add date check in `validate()` or `handleSubmit()`

### Files summary

| File | Change |
|------|--------|
| `src/pages/UmpireVote.tsx` | Add name prompt for first-time users; add match date validation |
| `src/pages/admin/ManageUmpires.tsx` | New page: list umpires, edit names, create email-less umpires |
| `src/components/AdminLayout.tsx` | Add "Umpires" nav link |
| `src/App.tsx` | Add `/admin/umpires` route |
| Migration | Add admin UPDATE and INSERT policies on `profiles` |


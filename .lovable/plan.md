

## Plan: Implement Sections 1 and 2

### Section 1 — Security Fixes

**1a. Fix `check-umpire-email` edge function** (`supabase/functions/check-umpire-email/index.ts`)
- Replace all `listUsers()` calls with `getUserByEmail(email)` for both `check` and `create` actions
- `check`: use `supabaseAdmin.auth.admin.getUserByEmail(email)` — if error (user not found), return `{ exists: false }`; if found, check profile `is_disabled`
- `create`: use `getUserByEmail` to check existence before creating

**1b. Password minimum 8 characters**
- Edge function: change `password.length < 6` to `< 8`, update error message
- `UmpireLogin.tsx`: change validation from `< 6` to `< 8`, update `minLength` attributes and placeholder text

**1c. Audit log RLS** — migration to drop/recreate the insert policy (already correct in DB, but run idempotent migration to confirm)

### Section 2 — UX Improvements

**2a. Confirmation dialogs in `Submissions.tsx`**
- Import `AlertDialog` components
- Wrap Approve button: "Are you sure you want to approve this submission? This cannot be undone." with Confirm/Cancel
- Wrap Delete button: "Are you sure you want to delete this submission? It will be hidden but can be restored later." with Delete (destructive)/Cancel

**2b. Recent pending submissions on `Dashboard.tsx`**
- Below stats cards, query `vote_submissions` where `is_deleted=false`, `is_approved=false`, limit 10, ordered by `submitted_at desc`
- Join with rounds, divisions, profiles for names
- Each row: round name, division name, umpire name, submitted date, "View" button linking to `/admin/submissions`
- If none, show green "All submissions are approved" message

**2c. New `UmpireHistory.tsx` at `/umpire/history`**
- Requires auth; loads own submissions with round/division/team names and vote lines
- Status badges: Pending (amber), Approved (green)
- Shows vote lines per submission
- Add route to `App.tsx`
- Add "View my submission history" link on UmpireVote confirmation screen and in the umpire header

**2d. Admin inactivity timeout in `auth.tsx`**
- For admin users only, 60-minute timeout on mousemove/keydown/click
- On timeout: `signOut()`, redirect to `/admin/login`, toast "You have been signed out due to inactivity."
- useEffect with timer reset on activity events

**2e. CSV fixture import in `ManageFixtures.tsx`**
- "Import CSV" button next to "Add Fixture"
- Dialog with helper text showing expected format: `round_name,division_name,home_team_name,away_team_name,venue`
- Parse CSV, case-insensitive name lookup for round/division/teams
- Error list for unmatched rows, insert valid ones
- Summary toast: "X fixtures imported, Y rows skipped"

### Files summary

| File | Change |
|------|--------|
| `supabase/functions/check-umpire-email/index.ts` | Replace `listUsers()` with `getUserByEmail()`, 8-char password |
| `src/pages/UmpireLogin.tsx` | 8-char password minimum |
| Migration SQL | Idempotent audit_log RLS fix |
| `src/pages/admin/Submissions.tsx` | AlertDialog confirmations for approve/delete |
| `src/pages/admin/Dashboard.tsx` | Recent pending submissions section |
| `src/pages/UmpireHistory.tsx` | **New** — umpire vote history |
| `src/lib/auth.tsx` | Admin 60-min inactivity timeout |
| `src/pages/admin/ManageFixtures.tsx` | CSV import dialog |
| `src/pages/UmpireVote.tsx` | Add "View history" link on confirmation screen |
| `src/App.tsx` | Add `/umpire/history` route |




## Plan: Fix OTP emails to send codes (not magic links), add forgot password and password visibility to Admin Login

### Problem Summary

1. **Umpire OTP emails** are sending a magic link button ("Log In") instead of the 6-digit code. This is because the default Supabase email template only includes a magic link, not the OTP token.
2. **Admin Login** is missing a "Forgot Password" button and a password visibility toggle (eye icon).

---

### 1. Fix OTP email template to show the 6-digit code

Scaffold custom auth email templates using the `email_domain--scaffold_auth_email_templates` tool. This will create editable email templates in the project. Then modify the **Magic Link / OTP template** to display the `{{ .Token }}` (6-digit code) prominently instead of a clickable link.

The email should say something like:
> "Your verification code is: **{{ .Token }}**"
> "Enter this code in the app to sign in."

Remove or de-emphasize the magic link button.

---

### 2. Admin Login — Forgot Password

- Add a "Forgot Password?" link below the password field in `AdminLogin.tsx`
- Toggle to a "forgot password" view that takes just the email and calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
- Create a new `/reset-password` page that:
  - Detects the recovery token from the URL hash
  - Shows a "Set new password" form
  - Calls `supabase.auth.updateUser({ password })`
- Add the route to `App.tsx`

---

### 3. Admin Login — Password visibility toggle

- Add `showPassword` state to `AdminLogin.tsx`
- Toggle the password input `type` between `"password"` and `"text"`
- Add an `Eye` / `EyeOff` icon button on the right side of the password input

---

### Files to create/modify

| File | Change |
|------|--------|
| Email templates (scaffolded) | Modify OTP template to show code, not link |
| `src/pages/AdminLogin.tsx` | Add forgot password flow + password visibility toggle |
| `src/pages/ResetPassword.tsx` | New page for password reset |
| `src/App.tsx` | Add `/reset-password` route |


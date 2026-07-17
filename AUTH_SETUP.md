# PlastiFlow Authentication Setup Guide

This guide explains how to set up email-based authentication with password reset functionality using Supabase.

## Overview

The authentication system has been updated to use:
- ✅ **Email/Password Authentication** (instead of Google OAuth)
- ✅ **Email-based Password Reset** (Supabase sends reset links)
- ✅ **User Registration** (Self-service signup)
- ✅ **Secure Password Management**

## Prerequisites

1. A Supabase project (Free tier works great)
2. Environment variables configured

## Step 1: Update Environment Variables

Make sure your `.env.local` file contains:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY-HERE
```

Get these values from your Supabase project dashboard:
- **Settings** → **API**
- Copy "Project URL" and "anon public" key

## Step 2: Enable Email Configuration in Supabase

The password reset emails are automatically handled by Supabase. To customize email templates:

### Option A: Use Supabase Default Emails (Recommended for getting started)
Supabase sends emails from `noreply@supabasemail.com` by default. This works immediately with no setup.

### Option B: Configure Custom SMTP (Recommended for production)

1. Go to **Project Settings** → **Email Templates** in Supabase
2. Enable **Custom SMTP** if you have your own email service
3. Or configure **Resend**, **SendGrid**, or **AWS SES**

Steps to use Resend (recommended for simple setup):
1. Sign up at [https://resend.com](https://resend.com)
2. Get your API key
3. In Supabase: Settings → Email → Custom SMTP
4. Select **Resend** and enter your API key

### Option C: Configure Email in Supabase UI (Easiest)
Go to **Authentication** → **Email Templates** and configure:
- **Confirm Email** (for new signups)
- **Reset Password** (for password reset requests)

Customize the email subject, template, and sender address.

## Step 3: Ensure Password Reset Redirect URL is Configured

1. Go to **Authentication** → **Redirect URLs** in Supabase
2. Add these redirect URLs:
   ```
   http://localhost:3000/reset-password
   http://localhost:3000/auth/callback
   https://yourdomain.com/reset-password
   https://yourdomain.com/auth/callback
   ```

## Step 4: Test the Authentication Flow

### Sign Up
1. Navigate to `http://localhost:3000/login`
2. Click **"Create account"**
3. Enter email and password (min 8 characters)
4. Check your email for confirmation link

### Sign In
1. After confirming email, go to login page
2. Enter email and password
3. You should be redirected to dashboard

### Password Reset
1. On login page, click **"Forgot password?"**
2. Enter your email
3. Check email for reset link
4. Click link to set new password
5. Login with new password

## Step 5: (Optional) Disable Email Confirmations

If you want users to sign in immediately without email confirmation:

1. In Supabase: **Authentication** → **Providers** → **Email**
2. Toggle off **"Confirm email"**
3. Users can sign in immediately after signup

⚠️ **Note**: If disabled, password reset emails will still work.

## Authentication Pages

Your app now includes these authentication pages:

| Page | Route | Purpose |
|------|-------|---------|
| **Login** | `/login` | Sign in with email & password |
| **Sign Up** | `/signup` | Create new account |
| **Forgot Password** | `/forgot-password` | Request password reset |
| **Reset Password** | `/reset-password` | Set new password (from email link) |

## Key Changes from Previous Setup

### Removed
- ❌ Google OAuth sign-in button
- ❌ OAuth redirect handling

### Added
- ✅ Email/password form fields
- ✅ Password visibility toggle
- ✅ Password strength validation (min 8 characters)
- ✅ Confirm password field on signup
- ✅ Forgot password flow
- ✅ Password reset page
- ✅ Error and success messages
- ✅ Loading states

## Troubleshooting

### "Invalid reset link" error
- The reset token has expired (they last 24 hours)
- User needs to request a new reset link

### "Could not sign in" error
- Email not found or password incorrect
- Check email exists and password is correct

### Emails not received
1. Check Supabase **Auth Logs** for any errors
2. Verify email address is correct
3. Check spam/junk folder
4. Ensure SMTP is configured (if using custom emails)
5. Test with Supabase's built-in email first

### Password reset email goes to wrong address
- Verify SMTP configuration in Supabase
- Check email template sender address
- Make sure reply-to address is set

## Email Template Customization

In Supabase, you can customize the email templates for:

1. **Email Confirmation** - Shown on signup
2. **Password Reset** - Sent when user requests password reset
3. **Magic Link** - (Not used in this setup)

Example password reset email structure:
```
Subject: Reset your password
From: noreply@example.com

Hi {{ .Email }},

Click the link below to reset your password:
{{ .ConfirmationURL }}

This link expires in 24 hours.
```

## Security Considerations

✅ **Password Requirements**
- Minimum 8 characters
- Passwords validated before sending to Supabase
- Supabase enforces secure password policies

✅ **Reset Tokens**
- Expire after 24 hours
- Single use only
- Secured by Supabase

✅ **Session Management**
- Sessions stored securely in cookies
- Automatic logout on token expiration
- Protected routes require authentication

## API Routes (Backend)

Authentication is handled client-side using Supabase client library:
- `@supabase/supabase-js` - Handles all auth requests
- `@supabase/ssr` - Manages session cookies securely

No custom backend auth routes needed!

## Next Steps

1. ✅ Test all authentication flows locally
2. ✅ Configure your SMTP/email service
3. ✅ Customize email templates
4. ✅ Deploy to production
5. ✅ Update production redirect URLs in Supabase

---

**Need help?** Check Supabase docs: https://supabase.com/docs/guides/auth

# User Creation Timing Fix

## Problem
Previously, user profiles were created in the database immediately when users entered their name and email, before they verified their email address. This meant unverified users had database entries.

## Solution
Updated the user creation flow to only create profiles after email verification:

### Database Changes (Migration: `20250908000005_fix_user_creation_timing.sql`)

1. **Removed automatic profile creation trigger**
   - Dropped `on_auth_user_created` trigger that fired on user insertion

2. **Added verification-based triggers**
   - `on_auth_user_verified`: Creates profile when `email_confirmed_at` changes from NULL to timestamp
   - `on_auth_user_created_verified`: Handles users who are immediately verified (OAuth)

3. **Cleanup of existing unverified users**
   - Removes profiles, progress, and certificates for users who haven't verified emails

### Frontend Changes

1. **Updated AuthModal messaging**
   - Clarifies that account creation happens after verification
   - Better user expectations management

## New Flow

1. User enters name and email → Magic link sent
2. User clicks magic link → Email verified
3. **Profile created in database** ← This now happens here
4. User can access the competition

## Benefits

- No database clutter from unverified users
- Cleaner user management
- Better data integrity
- Clearer user experience

## Migration Instructions

1. Run the migration in Supabase SQL Editor
2. Existing unverified users will be cleaned up automatically
3. New users will only get profiles after email verification

## Testing

- Enter name/email → Check database (no profile should exist)
- Verify email → Check database (profile should now exist)
- Existing verified users should be unaffected
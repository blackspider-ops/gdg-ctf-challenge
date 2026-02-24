# Emergency Access Codes

## 🚨 Emergency Admin Access

If Supabase authentication is completely down and you need admin access:

### Emergency Admin Code: `A7F3E9D2C8B1`

**How to use:**
1. Go to the signup page
2. Enter your name and email
3. Click "Send Verification Code"
4. In the OTP field, enter: `A7F3E9D2C8B1`
5. You will be granted immediate admin access

**⚠️ SECURITY WARNING:**
- Keep this code secret and secure
- Only use in emergencies when normal authentication fails
- Change the code in `src/hooks/useEmergencyAdmin.ts` if compromised

## 🔧 Fallback Authentication

For regular users when email authentication fails:

### Admin Controls:
1. Go to Admin Panel → Settings tab
2. Find "Fallback Authentication" section
3. Click "Enable" to generate a 5-digit access code
4. Share the code with users when needed

### User Instructions:
1. Try normal signup first
2. If email fails, click "Use Fallback Login"
3. Enter your name, email, and the 5-digit code provided by admin
4. You'll be logged in with player access

## 🛠️ Technical Details

### Files:
- `src/hooks/useFallbackAuth.ts` - 5-digit code system
- `src/hooks/useEmergencyAdmin.ts` - Emergency admin access
- `src/components/auth/FallbackLogin.tsx` - Fallback UI
- `src/components/auth/AuthModal.tsx` - Integrated auth flow

### Database Settings:
- `fallback_auth_enabled` - Enable/disable fallback login
- `fallback_access_code` - Current 5-digit code

### How It Works:
1. **Normal Flow**: Supabase email OTP → Profile creation
2. **Fallback Flow**: 5-digit code → Local storage session
3. **Emergency Flow**: Hex code → Instant admin + local storage

### Persistence:
- Fallback users: Stored in `localStorage` as `fallback_user`
- Emergency admins: Stored in `localStorage` as `emergency_admin`
- Sessions persist across browser refreshes
- Manual logout clears local storage

## 🔄 Recovery Scenarios

### Scenario 1: Supabase Rate Limits
- Enable fallback auth in admin panel
- Share 5-digit code with users
- Users can continue participating

### Scenario 2: Complete Supabase Outage
- Use emergency admin code: `A7F3E9D2C8B1`
- Enable fallback auth for all users
- Event can continue without Supabase

### Scenario 3: Lost Admin Access
- Any user can use emergency code to become admin
- First person to use it should disable it for others
- Restore normal admin access when Supabase recovers

## 📝 Best Practices

1. **Test fallback systems** before events
2. **Keep emergency code secure** - don't share publicly
3. **Disable fallback auth** when not needed
4. **Monitor for abuse** - check who's using fallback codes
5. **Have backup communication** to share codes with users

---

**Remember:** These are emergency systems. Always prefer normal Supabase authentication when available.
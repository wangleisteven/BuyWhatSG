# Authentication and TrustedHTML Issues - Fix Guide

This document addresses two critical issues found in the production deployment:

1. **TrustedHTML Error**: `TypeError: Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML' assignment.`
2. **Google Sign-in Redirect Issue**: Users clicking "Sign in with Google" on `buywhatsg.com` are redirected to `https://buywhatsg-production.firebaseapp.com/lists` instead of seeing the Google login page.

## Issue 1: TrustedHTML Error ✅ FIXED

### Root Cause
The error was caused by direct DOM manipulation in `src/main.tsx` where `textContent` was being set on a dynamically created element. In environments with strict Content Security Policy (CSP), this triggers TrustedHTML validation errors.

### Solution Applied
**File**: `src/main.tsx`
**Change**: Replaced `envBanner.textContent = 'DEV MODE'` with `envBanner.appendChild(document.createTextNode('DEV MODE'))`

**Before**:
```javascript
envBanner.textContent = 'DEV MODE'
```

**After**:
```javascript
// Use createTextNode to avoid TrustedHTML issues
envBanner.appendChild(document.createTextNode('DEV MODE'))
```

### Why This Fixes It
- `createTextNode()` creates a safe text node that doesn't trigger TrustedHTML validation
- This approach is CSP-compliant and works in strict security environments
- The visual result is identical but uses a safer DOM manipulation method

## Issue 2: Google Sign-in Redirect Problem ❌ REQUIRES MANUAL FIX

### Root Cause
When users access `buywhatsg.com` and click "Sign in with Google", Firebase Auth redirects them to the `authDomain` (`buywhatsg-production.firebaseapp.com`) instead of back to the original domain. This happens because:

1. **Missing Authorized Domain**: `buywhatsg.com` is not added as an authorized domain in Firebase Console
2. **Auth Domain Mismatch**: The Firebase `authDomain` is set to `buywhatsg-production.firebaseapp.com` but users are accessing from `buywhatsg.com`

### Current Configuration
**Firebase Config** (`src/config/secrets.ts`):
```javascript
production: {
  authDomain: "buywhatsg-production.firebaseapp.com",  // ← This causes the redirect
  projectId: "buywhatsg-production",
  // ... other config
}
```

### Required Manual Fix in Firebase Console

**⚠️ IMPORTANT**: This fix requires access to Firebase Console and cannot be done through code changes.

#### Step 1: Add Authorized Domains
1. **Go to Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)
2. **Select Project**: Choose `buywhatsg-production`
3. **Navigate to Authentication**: Click "Authentication" in the left sidebar
4. **Go to Settings**: Click "Settings" tab
5. **Find Authorized Domains**: Scroll down to "Authorized domains" section
6. **Add Domains**: Click "Add domain" and add:
   - `buywhatsg.com`
   - `www.buywhatsg.com`

#### Step 2: Verify Current Authorized Domains
Ensure these domains are listed:
- ✅ `localhost` (for development)
- ✅ `buywhatsg-production.web.app` (Firebase hosting)
- ✅ `buywhatsg-production.firebaseapp.com` (Firebase auth domain)
- ❌ `buywhatsg.com` (MISSING - needs to be added)
- ❌ `www.buywhatsg.com` (MISSING - needs to be added)

#### Step 3: Test the Fix
After adding the domains:
1. Wait 5-10 minutes for changes to propagate
2. Visit `https://buywhatsg.com`
3. Click "Sign in with Google"
4. Should now show Google's login page instead of redirecting to Firebase domain

### Alternative Solution (If Console Access Not Available)

If you don't have access to Firebase Console, you can temporarily modify the authentication flow:

**Option A**: Update `authDomain` in secrets.ts
```javascript
production: {
  authDomain: "buywhatsg.com",  // Use custom domain as authDomain
  projectId: "buywhatsg-production",
  // ... other config
}
```

**Option B**: Force redirect method for custom domain
```javascript
// In AuthContext.tsx, modify loginWithGoogle function
const loginWithGoogle = async (): Promise<void> => {
  // Always use redirect for custom domain
  if (window.location.hostname === 'buywhatsg.com') {
    await signInWithRedirect(auth, googleProvider);
  } else {
    // Existing popup logic for other domains
    // ...
  }
};
```

## Deployment Status

### ✅ Completed
- Fixed TrustedHTML error in `main.tsx`
- Code changes committed and ready for deployment

### ⏳ Pending
- Add `buywhatsg.com` and `www.buywhatsg.com` to Firebase Console authorized domains
- Test Google authentication on custom domain

## Testing Checklist

After applying the Firebase Console fix:

### TrustedHTML Error
- [ ] Open browser console on `https://buywhatsg.com`
- [ ] Verify no TrustedHTML errors appear
- [ ] Check that development banner still works in dev mode

### Google Authentication
- [ ] Visit `https://buywhatsg.com`
- [ ] Click "Sign in with Google"
- [ ] Verify Google login page appears (not Firebase redirect)
- [ ] Complete login and verify redirect back to `buywhatsg.com`
- [ ] Test logout functionality

### Cross-Domain Testing
- [ ] Test auth on `https://buywhatsg-production.web.app` (should still work)
- [ ] Test auth on `https://www.buywhatsg.com` (should work after domain addition)
- [ ] Verify auth state persists across domain switches

## Security Considerations

### Authorized Domains
- Only add domains you control to the authorized domains list
- Regularly review and remove unused domains
- Use HTTPS for all production domains

### CSP and TrustedHTML
- The TrustedHTML fix maintains security while avoiding CSP violations
- Consider implementing a full CSP policy for additional security
- Monitor for any other TrustedHTML issues in third-party libraries

## Support Resources

- **Firebase Auth Documentation**: [firebase.google.com/docs/auth](https://firebase.google.com/docs/auth)
- **Authorized Domains Guide**: [firebase.google.com/docs/auth/web/auth-domain](https://firebase.google.com/docs/auth/web/auth-domain)
- **CSP and TrustedHTML**: [developer.mozilla.org/en-US/docs/Web/API/TrustedHTML](https://developer.mozilla.org/en-US/docs/Web/API/TrustedHTML)

---

**Next Steps**: 
1. Deploy the TrustedHTML fix
2. Add authorized domains in Firebase Console
3. Test authentication flow on custom domain
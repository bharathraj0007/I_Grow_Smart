# User Access Control Implementation Guide

## Overview

This document outlines the comprehensive access control system implemented to prevent unregistered users from accessing protected pages and features in the Smart Agriculture Support System.

## Architecture

### Components

#### 1. **AuthorizedRoute** (`src/components/AuthorizedRoute.tsx`)
A protective wrapper component that checks user authentication status before rendering protected pages.

**Features:**
- Checks if user is authenticated via `useAuth()` hook
- Shows loading spinner while auth state is being determined
- Redirects unauthenticated users to `/signin` page
- Allows authenticated users to access protected content

**Usage:**
```tsx
<Route 
  path="/crop-recommendation" 
  element={<AuthorizedRoute><CropRecommendationPage /></AuthorizedRoute>} 
/>
```

#### 2. **ProtectedRoute** (`src/components/ProtectedRoute.tsx`)
Existing component that handles admin-specific access control with additional role-based access.

**Features:**
- Admin role verification
- Permission-based access control
- Database table access restrictions

## Access Control Classification

### 🟢 Public Routes (No Authentication Required)

Users can access these pages without logging in:

1. **Home Page** (`/`)
   - Landing page with general information
   - Features overview
   - Call-to-action to sign up

2. **Marketing Page** (`/marketing`)
   - Crop marketplace browsing
   - View crop listings and prices
   - No purchase capability without account

3. **Schemes Page** (`/schemes`)
   - View government agricultural schemes
   - Read scheme details and eligibility criteria

4. **Newsletters Page** (`/newsletters`)
   - Browse agricultural news and updates
   - Read newsletter articles and insights

5. **Newsletter Detail Page** (`/newsletters/:id`)
   - Read individual newsletter content
   - View detailed agricultural information

### 🔴 Protected Routes (Authentication Required)

Users must be logged in to access these pages. Unregistered users are redirected to `/signin`:

1. **Crop Recommendation** (`/crop-recommendation`)
   - Uses ANN algorithm with TensorFlow.js
   - Personalized crop suggestions
   - Requires user authentication to save recommendations

2. **Price Prediction** (`/price-prediction`)
   - Market price forecasting
   - Historical data analysis
   - User-specific prediction tracking

3. **Disease Prediction** (`/disease-prediction`)
   - Plant disease identification
   - Treatment recommendations
   - Uses AI image analysis

4. **Plant Identification** (`/plant-identification`)
   - Image-based plant identification
   - PlantNet API integration
   - User-specific history tracking

5. **Support Page** (`/support`)
   - Submit support tickets
   - Track issue resolution
   - Requires user context

6. **Profile Settings** (`/profile`)
   - User account management
   - Farm details and preferences
   - Personal information management

7. **Cart Page** (`/cart`)
   - Shopping cart management
   - Order preparation
   - Requires user account

8. **My Orders Page** (`/my-orders`)
   - View order history
   - Track deliveries
   - User-specific transaction records

### 🛡️ Admin Routes (Authentication + Admin Role Required)

All routes under `/admin/*` require both authentication and admin role:

```
/admin                    - Admin Dashboard
/admin/crops             - Crop Management
/admin/listings          - Marketplace Listings Management
/admin/users             - User Management
/admin/schemes           - Government Schemes Management
/admin/newsletters       - Newsletter Management
/admin/tickets           - Support Tickets Management
/admin/database          - Database Table Browser
```

**Access Control Logic:**
1. User must be authenticated (checked by `AuthorizedRoute` wrapper)
2. User must have `is_admin = '1'` in `user_profiles` table
3. Verified via `ProtectedRoute` component with `requireAdmin` flag

## Authentication Flow

### User Registration

```
1. User visits /signup
2. Enters email, password, and display name
3. Account created in `users` table
4. User profile created in `user_profiles` with is_admin = '0'
5. Verification email sent (with OTP)
6. User directed to verify email
7. After verification, can sign in
```

### User Login

```
1. User visits /signin
2. Enters email and password
3. onAuthStateChanged triggers in AuthContext
4. User profile loaded from database
5. Admin status checked (is_admin field)
6. Redirected to:
   - /admin if is_admin = '1'
   - / (home) if regular user
```

### Access Protection

```
1. User tries to access /crop-recommendation
2. AuthorizedRoute checks user via useAuth()
3. If loading: Show spinner
4. If no user: Redirect to /signin
5. If user exists: Render CropRecommendationPage
```

## Database Schema - User Tables

### users
```sql
- id (PK)
- email (UNIQUE)
- email_verified (boolean)
- password_hash
- display_name
- avatar_url
- phone
- phone_verified (boolean)
- role
- metadata (JSON)
- created_at
- updated_at
- last_sign_in
```

### user_profiles
```sql
- user_id (PK, FK to users.id)
- full_name
- phone_number
- state
- district
- farm_size
- farming_type
- is_admin (STRING: '0' or '1') ⚠️ KEY FIELD
- created_at
- updated_at
```

## Security Considerations

### 1. **Client-Side Validation**
- `AuthorizedRoute` component prevents rendering of protected pages
- Unauthenticated users see loading spinner then redirect to signin

### 2. **Auth State Management**
```tsx
const { user, loading } = useAuth();

if (loading) return <LoadingSpinner />;
if (!user) return <Navigate to="/signin" />;
return children;
```

### 3. **Admin Verification**
- Admin status comes from `user_profiles.is_admin`
- Verified on every page load via `ProtectedRoute`
- Cannot be bypassed by direct URL access

### 4. **Backend Integration**
- All database operations require `user_id` context
- User can only access their own data (enforced in queries)
- Admin operations require `is_admin = '1'` check

## Implementation Checklist

- [x] Create `AuthorizedRoute` component
- [x] Separate public and protected routes in App.tsx
- [x] Protect user-specific features
- [x] Maintain admin route protection
- [x] Handle loading states during auth check
- [x] Ensure proper redirects to signin page
- [x] Preserve existing functionality
- [x] Document access control levels

## Testing Access Control

### Test Case 1: Unregistered User Access
1. Open browser in incognito/private mode
2. Visit `/crop-recommendation` directly
3. ✅ Should redirect to `/signin`

### Test Case 2: Registered User Access
1. Sign in with valid credentials
2. Visit `/crop-recommendation`
3. ✅ Should display crop recommendation page

### Test Case 3: Admin Access
1. Sign in with admin account (admin@agrisupport.com)
2. Navigate to `/admin`
3. ✅ Should display admin dashboard

### Test Case 4: Regular User Admin Access
1. Sign in as regular user
2. Try to access `/admin`
3. ✅ Should redirect to home page

### Test Case 5: Public Pages
1. Without signing in
2. Visit `/`, `/marketing`, `/schemes`, `/newsletters`
3. ✅ All should be accessible without authentication

## Redirect Behavior Summary

| Route | Authentication | Admin | Behavior |
|-------|----------------|-------|----------|
| `/` | ❌ | - | ✅ Accessible |
| `/marketing` | ❌ | - | ✅ Accessible |
| `/schemes` | ❌ | - | ✅ Accessible |
| `/newsletters` | ❌ | - | ✅ Accessible |
| `/crop-recommendation` | ✅ | - | → `/signin` if not auth |
| `/price-prediction` | ✅ | - | → `/signin` if not auth |
| `/disease-prediction` | ✅ | - | → `/signin` if not auth |
| `/plant-identification` | ✅ | - | → `/signin` if not auth |
| `/support` | ✅ | - | → `/signin` if not auth |
| `/profile` | ✅ | - | → `/signin` if not auth |
| `/cart` | ✅ | - | → `/signin` if not auth |
| `/my-orders` | ✅ | - | → `/signin` if not auth |
| `/admin/*` | ✅ | ✅ | → `/signin` if not auth, → `/` if not admin |

## Future Enhancements

1. **Email Verification Requirement**
   - Make email verification mandatory before accessing protected pages
   - Add middleware check for `email_verified` in AuthorizedRoute

2. **Rate Limiting**
   - Implement rate limiting on authentication attempts
   - Prevent brute force attacks on signin page

3. **Session Management**
   - Implement session timeout
   - Show warning before session expires

4. **Audit Logging**
   - Log all access to protected routes
   - Track unauthorized access attempts

5. **Two-Factor Authentication (2FA)**
   - Extend existing OTP verification
   - Require 2FA for admin accounts
   - Optional 2FA for regular users

## Troubleshooting

### Issue: Users can still access protected pages
**Solution:** Ensure `AuthorizedRoute` wrapper is applied to the route in App.tsx

### Issue: Admin cannot access /admin
**Solution:** Check that `is_admin = '1'` is set in `user_profiles` table for the admin user

### Issue: Redirect loops
**Solution:** Verify `/signin` route is not wrapped in `AuthorizedRoute`

### Issue: Loading spinner stuck
**Solution:** Check browser console for errors in `onAuthStateChanged` listener in AuthContext

## Summary

The Smart Agriculture Support System now has comprehensive access control:

✅ **Public Pages:** Home, Marketing, Schemes, Newsletters (accessible to all)
✅ **Protected Pages:** All user-specific features require authentication
✅ **Admin Pages:** Require both authentication and admin role
✅ **Unregistered Users:** Automatically redirected to signin
✅ **Admin Verification:** Checked on every access attempt

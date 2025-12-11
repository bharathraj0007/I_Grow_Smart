# Admin Database Access System

## Overview

The admin user has **complete database access** across all 14 tables with full CRUD (Create, Read, Update, Delete) operations.

## Complete Database Access List

### Accessible Tables (14 total)

1. **users** - User accounts and authentication
2. **user_profiles** - User profile information
3. **crops** - Crop database and details
4. **government_schemes** - Government subsidy schemes
5. **newsletters** - Newsletter publications
6. **crop_listings** - Marketplace crop listings
7. **support_tickets** - User support tickets
8. **crop_recommendations** - AI crop recommendations
9. **disease_predictions** - Plant disease predictions
10. **price_predictions** - Crop price predictions
11. **crop_offers** - Marketplace crop offers
12. **orders** - User orders
13. **marketplace_transactions** - Transaction records
14. **chatbot_conversations** - Chatbot conversation history

## Admin Permissions (13 total)

- **read_all** - Read from all tables
- **create_all** - Create records in all tables
- **update_all** - Update records in all tables
- **delete_all** - Delete records from all tables
- **manage_users** - Full user management
- **manage_crops** - Full crop management
- **manage_schemes** - Full scheme management
- **manage_newsletters** - Full newsletter management
- **manage_listings** - Full marketplace listing management
- **manage_tickets** - Full support ticket management
- **view_analytics** - View system analytics
- **full_access** - Complete database access

## CRUD Operations

Admins can perform **all CRUD operations** on every table:

### Create (INSERT)
```typescript
await blink.db.users.create({ /* data */ })
await blink.db.crops.create({ /* data */ })
// ... all tables
```

### Read (SELECT)
```typescript
const users = await blink.db.users.list()
const crops = await blink.db.crops.list()
// ... all tables
```

### Update (UPDATE)
```typescript
await blink.db.users.update(id, { /* data */ })
await blink.db.crops.update(id, { /* data */ })
// ... all tables
```

### Delete (DELETE)
```typescript
await blink.db.users.delete(id)
await blink.db.crops.delete(id)
// ... all tables
```

## Using Admin Access in Components

### 1. Using the useAdminAccess Hook (Recommended)

```typescript
import { useAdminAccess } from '@/hooks/useAdminAccess';

function MyComponent() {
  const adminAccess = useAdminAccess();
  
  // Check if user is admin
  if (!adminAccess.isAdmin) {
    return <div>Not authorized</div>;
  }
  
  // Check specific permissions
  if (adminAccess.canManageUsers) {
    // Show user management controls
  }
  
  // Check table access
  if (adminAccess.canAccessTable('users', 'delete')) {
    // Allow user deletion
  }
  
  // Available checks:
  // - adminAccess.isAdmin
  // - adminAccess.isFullAdmin
  // - adminAccess.canRead
  // - adminAccess.canCreate
  // - adminAccess.canUpdate
  // - adminAccess.canDelete
  // - adminAccess.canManageUsers
  // - adminAccess.canManageCrops
  // - adminAccess.canManageSchemes
  // - adminAccess.canManageNewsletters
  // - adminAccess.canManageListings
  // - adminAccess.canManageTickets
  // - adminAccess.canViewAnalytics
  // - adminAccess.hasPermission(permission)
  // - adminAccess.canAccessTable(table, operation)
  // - adminAccess.permissions (array)
  // - adminAccess.accessibleTables (array)
}
```

### 2. Using Protected Routes

```typescript
import ProtectedRoute from '@/components/ProtectedRoute';

<Route
  path="/admin"
  element={
    <ProtectedRoute requireAdmin>
      <AdminLayout />
    </ProtectedRoute>
  }
>
</Route>

// With specific permission requirement
<Route
  path="/admin/users"
  element={
    <ProtectedRoute 
      requireAdmin 
      requiredPermission="manage_users"
    >
      <UsersManagement />
    </ProtectedRoute>
  }
/>

// With table access requirement
<Route
  path="/admin/crops"
  element={
    <ProtectedRoute 
      requireAdmin 
      requiredTableAccess={{ table: 'crops', operation: 'delete' }}
    >
      <CropsManagement />
    </ProtectedRoute>
  }
/>
```

### 3. Using useAuth Hook

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { isAdmin, adminAccess } = useAuth();
  
  // adminAccess contains all permission information
  console.log(adminAccess.permissions); // Array of all permissions
  console.log(adminAccess.accessibleTables); // Array of all accessible tables
  console.log(adminAccess.fullDatabaseAccess); // Boolean
}
```

## Permission Utility Functions

### adminPermissions.ts

```typescript
import {
  hasAdminPermission,
  canAdminAccessTable,
  getAllAdminPermissions,
  getAllAccessibleTables,
  hasFullDatabaseAccess,
  getAdminAccessLevel,
  TABLE_DESCRIPTIONS
} from '@/utils/adminPermissions';

// Check if user has a permission
hasAdminPermission(true, 'manage_users') // true

// Check if can access a table
canAdminAccessTable(true, 'users', 'delete') // true

// Get all permissions
const allPerms = getAllAdminPermissions()

// Get all accessible tables
const allTables = getAllAccessibleTables()

// Check full access
hasFullDatabaseAccess(true) // true

// Get complete access object
const access = getAdminAccessLevel(true)

// Get table descriptions
const desc = TABLE_DESCRIPTIONS['users']
```

## Database Access Verification

All admin pages automatically verify access:

1. **AuthContext** verifies admin status on login
2. **ProtectedRoute** enforces admin-only access
3. **useAdminAccess** provides real-time permission checking
4. **Admin Dashboard** displays current access level

## Current Admin Pages

All admin pages have **full CRUD access** to their respective tables:

- **Admin Dashboard** - View system statistics and analytics
- **Users Management** - Create, read, update, delete users
- **Crops Management** - Create, read, update, delete crops
- **Listings Management** - Manage marketplace crop listings
- **Schemes Management** - Manage government schemes
- **Newsletters Management** - Manage newsletters
- **Tickets Management** - Manage support tickets

## Security Notes

1. **Admin-only routes** are protected by ProtectedRoute
2. **Permission checking** happens at multiple levels
3. **Database queries** automatically filter by user_id for regular users
4. **Admin users bypass** user_id filters for complete database access
5. **No additional authentication** required for database operations

## Adding New Admin Features

When adding new admin functionality:

1. Add the table to `DatabaseTable` type in `adminPermissions.ts`
2. Add the permission to `AdminPermission` type if needed
3. Add the table to `ALL_TABLES` array
4. Add description to `TABLE_DESCRIPTIONS` object
5. Use `ProtectedRoute` with `requireAdmin` prop
6. Use `useAdminAccess` for permission checks

## Example: Full User Management Page

```typescript
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAuth } from '@/contexts/AuthContext';
import { blink } from '@/lib/blink';
import { toast } from 'sonner';

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const adminAccess = useAdminAccess();
  const [users, setUsers] = useState([]);

  // Fetch all users (admin can see all)
  const fetchUsers = async () => {
    try {
      if (!adminAccess.canRead) {
        toast.error('No read access');
        return;
      }
      
      const data = await blink.db.users.list();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  // Delete user (admin only)
  const deleteUser = async (userId: string) => {
    try {
      if (!adminAccess.canDelete) {
        toast.error('No delete access');
        return;
      }
      
      await blink.db.users.delete(userId);
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div>
      {!isAdmin && <div>Not authorized</div>}
      {isAdmin && (
        // Admin content here
      )}
    </div>
  );
}
```

## Testing Admin Access

1. Create an admin user account
2. Go to `/admin` page
3. Verify admin panel loads
4. Check sidebar shows "Full Access Enabled"
5. Test CRUD operations on each table
6. Verify permissions are enforced

## Troubleshooting

### Admin Can't Access Dashboard
- Check `isAdmin` is '1' in user_profiles table
- Verify ProtectedRoute has `requireAdmin` prop
- Check auth context is properly loaded

### Permission Check Failing
- Verify admin user has `isAdmin = '1'`
- Check useAdminAccess hook is imported correctly
- Ensure using proper permission names

### Table Access Issues
- Verify table exists in database
- Check table name matches DatabaseTable type
- Ensure admin user is authenticated

---

**Last Updated:** December 2024
**Admin System Version:** 1.0

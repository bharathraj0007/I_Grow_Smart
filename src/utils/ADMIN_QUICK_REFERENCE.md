# Admin Access - Quick Reference Card

## ⚡ Quick Start

### Check Admin Status
```typescript
const { isAdmin, adminAccess } = useAuth();
const adminAccess = useAdminAccess();
```

### Protect Routes
```typescript
<ProtectedRoute requireAdmin>
  <AdminDashboard />
</ProtectedRoute>
```

### Check Permissions
```typescript
if (adminAccess.canManageUsers) { /* ... */ }
if (adminAccess.canDelete) { /* ... */ }
if (adminAccess.canAccessTable('users', 'delete')) { /* ... */ }
```

---

## 📋 All Admin Permissions

| Permission | Description |
|-----------|-------------|
| `read_all` | Read from all tables |
| `create_all` | Create in all tables |
| `update_all` | Update all tables |
| `delete_all` | Delete from all tables |
| `manage_users` | User management |
| `manage_crops` | Crop management |
| `manage_schemes` | Scheme management |
| `manage_newsletters` | Newsletter management |
| `manage_listings` | Listing management |
| `manage_tickets` | Support ticket management |
| `view_analytics` | View analytics |
| `full_access` | Complete database access |

---

## 🗄️ All Accessible Tables

1. `users`
2. `user_profiles`
3. `crops`
4. `government_schemes`
5. `newsletters`
6. `crop_listings`
7. `support_tickets`
8. `crop_recommendations`
9. `disease_predictions`
10. `price_predictions`
11. `crop_offers`
12. `orders`
13. `marketplace_transactions`
14. `chatbot_conversations`

---

## 🔑 useAdminAccess Hook - All Properties

```typescript
{
  isAdmin: boolean
  isFullAdmin: boolean
  permissions: AdminPermission[]
  accessibleTables: DatabaseTable[]
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canManageUsers: boolean
  canManageCrops: boolean
  canManageSchemes: boolean
  canManageNewsletters: boolean
  canManageListings: boolean
  canManageTickets: boolean
  canViewAnalytics: boolean
  hasPermission(permission): boolean
  canAccessTable(table, operation): boolean
  allPermissions(): AdminPermission[]
  allTables(): DatabaseTable[]
}
```

---

## 🎯 Common Patterns

### Conditional Rendering
```typescript
{adminAccess.canManageUsers && <UserButton />}
{adminAccess.canDelete && <DeleteButton />}
```

### Permission Guards
```typescript
if (!adminAccess.canUpdate) {
  return <div>No update access</div>;
}
```

### Table Operations
```typescript
// All admin operations work with any of 14 tables
await blink.db.users.list()
await blink.db.crops.create(data)
await blink.db.newsletters.update(id, data)
await blink.db.supportTickets.delete(id)
```

---

## 📍 Admin Pages & Their Access

| Page | Path | Access |
|------|------|--------|
| Dashboard | `/admin` | Read all tables, view analytics |
| Users | `/admin/users` | Full user management (CRUD) |
| Crops | `/admin/crops` | Full crop management (CRUD) |
| Listings | `/admin/listings` | Full listing management (CRUD) |
| Schemes | `/admin/schemes` | Full scheme management (CRUD) |
| Newsletters | `/admin/newsletters` | Full newsletter management (CRUD) |
| Tickets | `/admin/tickets` | Full ticket management (CRUD) |

---

## 🚀 Implementation Checklist

When using admin access in a component:

- [ ] Import `useAdminAccess` hook
- [ ] Check `isAdmin` status
- [ ] Verify required permissions
- [ ] Show/hide controls based on access
- [ ] Handle API errors gracefully
- [ ] Show user feedback (toast messages)
- [ ] Protect routes with `ProtectedRoute`

---

## 📦 Files Modified

- `src/utils/adminPermissions.ts` - Permission system
- `src/contexts/AuthContext.tsx` - Admin access context
- `src/hooks/useAdminAccess.ts` - Permission checking hook
- `src/components/ProtectedRoute.tsx` - Route protection
- `src/components/layout/AdminLayout.tsx` - Admin sidebar with access display
- `src/utils/ADMIN_ACCESS_GUIDE.md` - Full documentation

---

## ✅ Testing Checklist

- [ ] Admin user can access `/admin`
- [ ] Admin sidebar shows "Full Access Enabled"
- [ ] Admin can create crops
- [ ] Admin can update crops
- [ ] Admin can delete crops
- [ ] Admin can manage all 7 modules
- [ ] Non-admin users see redirect on `/admin`
- [ ] Permission checks work in components

---

## 🔐 Security Notes

✓ Admin-only routes protected  
✓ Permission checks at multiple levels  
✓ Admin bypasses user_id filters  
✓ Full database access for admins  
✓ No additional auth needed for DB ops

---

**Version:** 1.0 | **Status:** ✅ Active | **Last Updated:** Dec 2024

import { useAuth } from '@/contexts/AuthContext';
import { canAdminAccessTable, hasAdminPermission, getAllAdminPermissions, getAllAccessibleTables } from '@/utils/adminPermissions';
import type { AdminPermission, DatabaseTable, CRUDOperation } from '@/utils/adminPermissions';

/**
 * Hook to check admin permissions and database access
 * Provides convenient methods for permission checking in components
 */
export function useAdminAccess() {
  const { isAdmin, adminAccess } = useAuth();

  return {
    // Admin status
    isAdmin,
    isFullAdmin: adminAccess.fullDatabaseAccess,
    
    // Comprehensive access information
    permissions: adminAccess.permissions,
    accessibleTables: adminAccess.accessibleTables,
    
    // Individual permission checks
    canRead: adminAccess.canRead,
    canCreate: adminAccess.canCreate,
    canUpdate: adminAccess.canUpdate,
    canDelete: adminAccess.canDelete,
    
    // Module-specific permission checks
    canManageUsers: adminAccess.canManageUsers,
    canManageCrops: adminAccess.canManageCrops,
    canManageSchemes: adminAccess.canManageSchemes,
    canManageNewsletters: adminAccess.canManageNewsletters,
    canManageListings: adminAccess.canManageListings,
    canManageTickets: adminAccess.canManageTickets,
    canViewAnalytics: adminAccess.canViewAnalytics,
    
    // Permission checking methods
    hasPermission: (permission: AdminPermission) => hasAdminPermission(isAdmin, permission),
    canAccessTable: (table: DatabaseTable, operation: CRUDOperation) => canAdminAccessTable(isAdmin, table, operation),
    
    // Get all permissions
    allPermissions: () => getAllAdminPermissions(),
    allTables: () => getAllAccessibleTables()
  };
}

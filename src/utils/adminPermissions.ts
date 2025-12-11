/**
 * Admin Permission System
 * Manages complete database access for admin users across all tables and operations
 */

export type AdminPermission = 
  | 'read_all' 
  | 'create_all' 
  | 'update_all' 
  | 'delete_all' 
  | 'manage_users' 
  | 'manage_crops' 
  | 'manage_schemes' 
  | 'manage_newsletters' 
  | 'manage_listings' 
  | 'manage_tickets' 
  | 'view_analytics' 
  | 'full_access';

export type DatabaseTable = 
  | 'users' 
  | 'user_profiles' 
  | 'crops' 
  | 'government_schemes' 
  | 'newsletters' 
  | 'crop_listings' 
  | 'support_tickets' 
  | 'crop_recommendations' 
  | 'disease_predictions' 
  | 'price_predictions' 
  | 'crop_offers' 
  | 'orders' 
  | 'marketplace_transactions' 
  | 'chatbot_conversations';

export type CRUDOperation = 'create' | 'read' | 'update' | 'delete';

/**
 * Complete admin permission set
 * Admins have full CRUD access to all tables
 */
const ADMIN_PERMISSIONS: AdminPermission[] = [
  'read_all',
  'create_all',
  'update_all',
  'delete_all',
  'manage_users',
  'manage_crops',
  'manage_schemes',
  'manage_newsletters',
  'manage_listings',
  'manage_tickets',
  'view_analytics',
  'full_access'
];

/**
 * All database tables accessible to admin
 */
const ALL_TABLES: DatabaseTable[] = [
  'users',
  'user_profiles',
  'crops',
  'government_schemes',
  'newsletters',
  'crop_listings',
  'support_tickets',
  'crop_recommendations',
  'disease_predictions',
  'price_predictions',
  'crop_offers',
  'orders',
  'marketplace_transactions',
  'chatbot_conversations'
];

/**
 * Check if a user has a specific admin permission
 * @param isAdmin - Whether user is admin
 * @param permission - Permission to check
 * @returns true if user has permission
 */
export function hasAdminPermission(
  isAdmin: boolean,
  permission: AdminPermission
): boolean {
  if (!isAdmin) return false;
  return ADMIN_PERMISSIONS.includes(permission);
}

/**
 * Check if admin can perform CRUD operation on a table
 * @param isAdmin - Whether user is admin
 * @param table - Database table name
 * @param operation - CRUD operation (create, read, update, delete)
 * @returns true if operation is allowed
 */
export function canAdminAccessTable(
  isAdmin: boolean,
  table: DatabaseTable,
  operation: CRUDOperation
): boolean {
  if (!isAdmin) return false;
  if (!ALL_TABLES.includes(table)) return false;
  
  // Admin has full CRUD access to all tables
  return true;
}

/**
 * Get all permissions for an admin user
 * @returns Array of all admin permissions
 */
export function getAllAdminPermissions(): AdminPermission[] {
  return [...ADMIN_PERMISSIONS];
}

/**
 * Get all accessible tables for admin
 * @returns Array of all database tables
 */
export function getAllAccessibleTables(): DatabaseTable[] {
  return [...ALL_TABLES];
}

/**
 * Check if user has full database access (admin only)
 * @param isAdmin - Whether user is admin
 * @returns true if user has full access
 */
export function hasFullDatabaseAccess(isAdmin: boolean): boolean {
  return isAdmin && ADMIN_PERMISSIONS.includes('full_access');
}

/**
 * Validate admin status and return access level
 * @param isAdmin - Whether user is admin
 * @returns Access level object
 */
export function getAdminAccessLevel(isAdmin: boolean) {
  return {
    isAdmin,
    permissions: isAdmin ? ADMIN_PERMISSIONS : [],
    accessibleTables: isAdmin ? ALL_TABLES : [],
    fullDatabaseAccess: hasFullDatabaseAccess(isAdmin),
    canRead: isAdmin,
    canCreate: isAdmin,
    canUpdate: isAdmin,
    canDelete: isAdmin,
    canManageUsers: isAdmin,
    canManageCrops: isAdmin,
    canManageSchemes: isAdmin,
    canManageNewsletters: isAdmin,
    canManageListings: isAdmin,
    canManageTickets: isAdmin,
    canViewAnalytics: isAdmin
  };
}

/**
 * List of all accessible tables with descriptions
 */
export const TABLE_DESCRIPTIONS: Record<DatabaseTable, string> = {
  users: 'User accounts and authentication',
  user_profiles: 'User profile information',
  crops: 'Crop database and details',
  government_schemes: 'Government subsidy schemes',
  newsletters: 'Newsletter publications',
  crop_listings: 'Marketplace crop listings',
  support_tickets: 'User support tickets',
  crop_recommendations: 'AI crop recommendations',
  disease_predictions: 'Plant disease predictions',
  price_predictions: 'Crop price predictions',
  crop_offers: 'Marketplace crop offers',
  orders: 'User orders',
  marketplace_transactions: 'Transaction records',
  chatbot_conversations: 'Chatbot conversation history'
};

/**
 * Audit log entry for admin actions
 */
export interface AdminAuditLog {
  action: string;
  table: DatabaseTable;
  operation: CRUDOperation;
  userId: string;
  timestamp: string;
  details?: Record<string, any>;
}

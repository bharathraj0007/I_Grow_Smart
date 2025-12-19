import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import type { AdminPermission, DatabaseTable, CRUDOperation } from '@/utils/adminPermissions';
import { canAdminAccessTable } from '@/utils/adminPermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredPermission?: AdminPermission;
  requiredTableAccess?: {
    table: DatabaseTable;
    operation: CRUDOperation;
  };
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requiredPermission,
  requiredTableAccess 
}: ProtectedRouteProps) {
  const { user, isAdmin, adminAccess, loading, login } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      login(window.location.href);
    }
  }, [loading, user, login]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if admin is required
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Check for specific permission
  if (requiredPermission && !adminAccess.permissions.includes(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  // Check for table access with specific operation
  if (requiredTableAccess && !canAdminAccessTable(isAdmin, requiredTableAccess.table, requiredTableAccess.operation)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
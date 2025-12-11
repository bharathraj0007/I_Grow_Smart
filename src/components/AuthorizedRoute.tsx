import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthorizedRouteProps {
  children: React.ReactNode;
}

/**
 * AuthorizedRoute component wraps routes that require user authentication.
 * Unregistered users will be redirected to the sign-in page.
 * 
 * Usage:
 * <Route element={<AuthorizedRoute><Component /></AuthorizedRoute>} />
 */
export default function AuthorizedRoute({ children }: AuthorizedRouteProps) {
  const { user, loading } = useAuth();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not authenticated, redirect to sign-in page
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // User is authenticated, render the protected component
  return <>{children}</>;
}

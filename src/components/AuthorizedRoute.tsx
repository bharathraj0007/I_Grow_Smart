import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to signin with current path as redirect URL
      navigate(`/signin?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    }
  }, [loading, user, navigate, location]);

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not authenticated, start managed login redirect and show loader
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // User is authenticated, render the protected component
  return <>{children}</>;
}

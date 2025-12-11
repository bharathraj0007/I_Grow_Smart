import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';
import { blink } from '@/lib/blink';

// Default admin credentials
const DEFAULT_ADMIN_EMAIL = 'admin@agrisupport.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [justSignedIn, setJustSignedIn] = useState(false);
  const { signIn, user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Initialize default admin account on component mount
  useEffect(() => {
    const initializeAdminAccount = async () => {
      try {
        setInitializing(true);
        
        // Simple check: try to create admin account, if it fails, it already exists
        try {
          await blink.auth.signUp({
            email: DEFAULT_ADMIN_EMAIL,
            password: DEFAULT_ADMIN_PASSWORD,
            displayName: 'System Administrator'
          });
          console.log('✅ Admin account created successfully');
        } catch (signupError: any) {
          // Account already exists - this is fine
          console.log('ℹ️ Admin account already exists');
        }
      } catch (error) {
        console.error('Error during admin initialization:', error);
      } finally {
        setInitializing(false);
      }
    };

    initializeAdminAccount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign in first
      await signIn(email, password);
      
      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get the current user immediately after sign-in
      const currentUser = blink.auth.me();
      
      if (currentUser) {
        // For admin account, ensure profile exists with admin flag
        if (email === DEFAULT_ADMIN_EMAIL) {
          try {
            // First check if profile already exists
            const existingAdmin = await blink.db.sql<{ user_id: string }>(`
              SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1
            `, [currentUser.id]);
            
            if (existingAdmin.rows.length === 0) {
              // Only create if it doesn't exist
              await blink.db.sql(`
                INSERT INTO user_profiles (user_id, full_name, is_admin, phone_number, state, district, farm_size, farming_type, created_at, updated_at)
                VALUES (?, 'System Administrator', '1', '', '', '', 0, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `, [currentUser.id]);
              console.log('✅ Admin profile created for user:', currentUser.id);
            } else {
              console.log('✅ Admin profile already exists for user:', currentUser.id);
            }
          } catch (profileError: any) {
            console.log('⚠️ Profile creation error:', profileError.message);
          }
        } else {
          // For regular users, create profile if it doesn't exist
          try {
            const existingProfile = await blink.db.sql<{ user_id: string }>(`
              SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1
            `, [currentUser.id]);
            
            if (existingProfile.rows.length === 0) {
              await blink.db.sql(`
                INSERT INTO user_profiles (user_id, full_name, is_admin, phone_number, state, district, farm_size, farming_type, created_at, updated_at)
                VALUES (?, ?, '0', '', '', '', 0, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `, [currentUser.id, currentUser.displayName || 'User']);
              console.log('✅ Regular user profile created:', currentUser.id);
            } else {
              console.log('✅ Regular user profile already exists:', currentUser.id);
            }
          } catch (profileError: any) {
            console.log('⚠️ Regular profile creation error:', profileError.message);
          }
        }
      }
      
      setJustSignedIn(true);
      // Don't navigate here - let the useEffect handle it
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      toast.error(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  // Handle redirect after auth state is fully updated
  useEffect(() => {
    // Only redirect if we just signed in and user is loaded
    if (justSignedIn && user) {
      // Give extra time for profile to load (especially for admin)
      const timer = setTimeout(async () => {
        // Manually check admin status one more time
        try {
          const adminCheck = await blink.db.sql<{ is_admin: string }>(`
            SELECT is_admin FROM user_profiles WHERE user_id = ? LIMIT 1
          `, [user.id]);
          
          const isUserAdmin = adminCheck.rows.length > 0 && adminCheck.rows[0].is_admin === '1';
          
          setLoading(false); // Stop loading spinner
          
          if (isUserAdmin) {
            toast.success('Welcome back, Administrator!');
            navigate('/admin', { replace: true });
          } else {
            toast.success('Signed in successfully!');
            navigate('/', { replace: true });
          }
          
          setJustSignedIn(false); // Reset flag
        } catch (error) {
          console.error('Error checking admin status:', error);
          // Fallback to regular redirect
          setLoading(false);
          toast.success('Signed in successfully!');
          navigate('/', { replace: true });
          setJustSignedIn(false);
        }
      }, 1000); // Increased delay to ensure profile is loaded
      
      return () => clearTimeout(timer);
    }
  }, [justSignedIn, user, navigate]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Initializing system...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to access your agriculture dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-sm text-green-800 dark:text-green-200">
              <strong>Admin Access:</strong> Use the default admin credentials to access the admin panel:
              <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded font-mono text-xs">
                <div>Email: {DEFAULT_ADMIN_EMAIL}</div>
                <div>Password: {DEFAULT_ADMIN_PASSWORD}</div>
              </div>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="farmer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="text-primary hover:underline">
                Sign Up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

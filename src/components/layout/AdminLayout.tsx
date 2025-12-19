import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Sprout, 
  Users, 
  Award, 
  FileText, 
  MessageSquare,
  ArrowLeft,
  LogOut,
  ShoppingCart,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const location = useLocation();
  const { logout, profile } = useAuth();
  const adminAccess = useAdminAccess();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await logout();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/crops', icon: Sprout, label: 'Crops' },
    { path: '/admin/listings', icon: ShoppingCart, label: 'Crop Listings' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/schemes', icon: Award, label: 'Schemes' },
    { path: '/admin/newsletters', icon: FileText, label: 'Newsletters' },
    { path: '/admin/tickets', icon: MessageSquare, label: 'Support Tickets' }
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar - Fixed positioning */}
      <aside className="fixed left-0 top-0 w-64 h-screen bg-card border-r border-border flex flex-col z-40">
        <div className="h-16 border-b border-border flex items-center px-6 flex-shrink-0">
          <h2 className="font-semibold text-base">Admin Panel</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <div
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-3 flex-shrink-0">
          {/* Admin Access Status */}
          <div className="bg-primary/10 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary">Full Access Enabled</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="w-3 h-3 text-primary" />
                <p className="text-xs text-muted-foreground">
                  {adminAccess.accessibleTables.length} databases
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {adminAccess.permissions.length} permissions
              </Badge>
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <Button variant="ghost" className="w-full justify-start text-sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Site
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content - Offset for fixed sidebar */}
      <main className="fixed left-64 right-0 top-0 bottom-0 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, Shield, ShoppingCart, Package, Home, Brain, Leaf, Search, Store, FileText, Newspaper, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const cartItemCount = getTotalItems();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get user display name with proper fallback
  const displayName = profile?.fullName || user?.displayName || user?.email?.split('@')[0] || 'User';

  // Helper function to check if a path is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Navigation items configuration
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/crop-recommendation', label: 'Recommendations', icon: Leaf },
    { path: '/disease-prediction', label: 'Dr.Plant', icon: Brain },
    { path: '/plant-identification', label: 'Plant ID', icon: Search },
    { path: '/marketing', label: 'Marketing', icon: Store },
    { path: '/schemes', label: 'Schemes', icon: FileText },
    { path: '/newsletters', label: 'News', icon: Newspaper },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-md soil-texture">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center font-bold hover:opacity-80 transition-opacity flex-shrink-0">
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center gap-2 ml-auto">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive(path)
                    ? 'bg-primary/10 text-primary font-medium border border-primary/30'
                    : 'text-foreground hover:text-primary hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm whitespace-nowrap">{label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {/* Shopping Cart */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative" 
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  variant="destructive"
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            {user ? (
              <>
                {isAdmin && (
                  <Button variant="outline" className="hidden md:flex items-center space-x-2 border-primary text-primary" asChild>
                    <Link to="/admin">
                      <Shield className="w-4 h-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      {isAdmin && <Shield className="w-5 h-5 text-primary" />}
                      <User className="w-5 h-5" />
                      <span className="hidden md:inline">{displayName}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>
                      {isAdmin && (
                        <div className="flex items-center space-x-2 text-primary font-bold">
                          <Shield className="w-4 h-4" />
                          <span>Administrator</span>
                        </div>
                      )}
                      {!isAdmin && 'My Account'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/my-orders')}>
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="text-primary font-semibold">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link to="/signin">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border py-4 space-y-2 animate-in fade-in slide-in-from-top-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                onClick={() => handleNavClick(path)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive(path)
                    ? 'bg-primary/10 text-primary font-medium border-l-4 border-primary'
                    : 'text-foreground hover:text-primary hover:bg-muted'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

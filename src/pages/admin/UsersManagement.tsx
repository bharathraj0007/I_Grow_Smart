import { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Search, Eye, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/types';

interface EnhancedUserProfile extends UserProfile {
  email?: string;
  displayName?: string;
  emailVerified?: number;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<EnhancedUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<EnhancedUserProfile | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('📊 Fetching users with profiles...');
      
      // Join users and user_profiles tables to get complete information
      const result = await blink.db.sql(`
        SELECT 
          u.id as user_id,
          u.email,
          u.display_name,
          u.email_verified,
          u.created_at as user_created_at,
          up.full_name,
          up.phone_number,
          up.state,
          up.district,
          up.farm_size,
          up.farming_type,
          up.is_admin,
          up.created_at,
          up.updated_at
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        ORDER BY u.created_at DESC
        LIMIT 1000
      `);
      
      // Handle different response formats from the SDK
      let rows: any[] = [];
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && typeof result === 'object' && Array.isArray(result.rows)) {
        rows = result.rows;
      } else if (result && typeof result === 'object') {
        // If result is a single object, wrap it in an array
        rows = [result];
      } else {
        rows = [];
      }
      
      console.log(`✅ Fetched ${rows.length} users`);
      
      // Transform the data to match the component's expected format
      const transformedUsers = rows.map((row: any) => {
        // Prioritize full_name from profile, then display_name from users table
        const name = row.full_name || row.display_name || 'Unknown User';
        
        return {
          userId: row.user_id,
          email: row.email,
          displayName: row.display_name,
          emailVerified: row.email_verified,
          fullName: name,
          phoneNumber: row.phone_number,
          state: row.state,
          district: row.district,
          farmSize: row.farm_size,
          farmingType: row.farming_type,
          isAdmin: row.is_admin || '0',
          createdAt: row.created_at || row.user_created_at,
          updatedAt: row.updated_at
        };
      });
      
      setUsers(transformedUsers);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };



  const handleViewDetails = (user: UserProfile) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const filteredUsers = users.filter(user =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Users Management</h1>
          <p className="text-muted-foreground">View registered users and their details</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {users.filter(u => u.isAdmin === '1').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {users.filter(u => u.isAdmin !== '1').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search users by name, email, phone, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Farm Size</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No users found matching your search' : 'No users registered yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">
                        {user.fullName || user.displayName || user.email?.split('@')[0] || 'Unknown User'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.email || '-'}
                          {user.emailVerified === 1 && (
                            <Badge variant="outline" className="text-xs">Verified</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.phoneNumber || '-'}</TableCell>
                      <TableCell>{user.district ? `${user.district}, ${user.state}` : '-'}</TableCell>
                      <TableCell>{user.farmSize ? `${user.farmSize} acres` : '-'}</TableCell>
                      <TableCell>
                        {user.isAdmin === '1' ? (
                          <Badge variant="default" className="gap-1">
                            <Shield className="w-3 h-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(user)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about this user's profile and account.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-base">
                    {selectedUser.fullName || selectedUser.displayName || selectedUser.email?.split('@')[0] || 'Unknown User'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-base">{selectedUser.email || 'N/A'}</p>
                  {selectedUser.emailVerified === 1 && (
                    <Badge variant="outline" className="text-xs mt-1">Email Verified</Badge>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <p className="text-base font-mono text-sm">{selectedUser.userId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-base">{selectedUser.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="text-base">
                    {selectedUser.isAdmin === '1' ? (
                      <Badge variant="default" className="gap-1">
                        <Shield className="w-3 h-3" />
                        Administrator
                      </Badge>
                    ) : (
                      <Badge variant="outline">Regular User</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">State</label>
                  <p className="text-base">{selectedUser.state || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">District</label>
                  <p className="text-base">{selectedUser.district || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Farm Size</label>
                  <p className="text-base">
                    {selectedUser.farmSize ? `${selectedUser.farmSize} acres` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Farming Type</label>
                  <p className="text-base">{selectedUser.farmingType || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Joined Date</label>
                  <p className="text-base">
                    {selectedUser.createdAt 
                      ? new Date(selectedUser.createdAt).toLocaleString() 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-base">
                    {selectedUser.updatedAt 
                      ? new Date(selectedUser.updatedAt).toLocaleString() 
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

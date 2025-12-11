import { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Check, X, Loader2, Package, MapPin, Phone, IndianRupee, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface CropListing {
  id: string;
  userId: string;
  sellerName: string;
  sellerPhone: string;
  sellerLocation: string;
  cropId?: string;
  cropName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  description?: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function ListingsManagement() {
  const [pendingListings, setPendingListings] = useState<CropListing[]>([]);
  const [approvedListings, setApprovedListings] = useState<CropListing[]>([]);
  const [rejectedListings, setRejectedListings] = useState<CropListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllListings();
  }, []);

  const fetchAllListings = async () => {
    setLoading(true);
    try {
      const [pending, approved, rejected] = await Promise.all([
        blink.db.cropListings.list<CropListing>({
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          limit: 1000  // Increased limit to fetch all pending listings
        }),
        blink.db.cropListings.list<CropListing>({
          where: { status: 'approved' },
          orderBy: { updatedAt: 'desc' },
          limit: 1000  // Increased limit to fetch all approved listings
        }),
        blink.db.cropListings.list<CropListing>({
          where: { status: 'rejected' },
          orderBy: { updatedAt: 'desc' },
          limit: 1000  // Increased limit to fetch all rejected listings
        })
      ]);

      console.log(`✓ Fetched ${pending.length} pending, ${approved.length} approved, ${rejected.length} rejected listings`);
      setPendingListings(pending);
      setApprovedListings(approved);
      setRejectedListings(rejected);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listingId: string) => {
    setProcessingId(listingId);
    try {
      await blink.db.cropListings.update(listingId, {
        status: 'approved',
        updatedAt: new Date().toISOString()
      });
      toast.success('Listing approved successfully!');
      fetchAllListings();
    } catch (error) {
      console.error('Error approving listing:', error);
      toast.error('Failed to approve listing');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (listingId: string) => {
    if (!confirm('Are you sure you want to reject this listing?')) return;
    
    setProcessingId(listingId);
    try {
      await blink.db.cropListings.update(listingId, {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
      toast.success('Listing rejected');
      fetchAllListings();
    } catch (error) {
      console.error('Error rejecting listing:', error);
      toast.error('Failed to reject listing');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Are you sure you want to permanently delete this listing?')) return;
    
    setProcessingId(listingId);
    try {
      await blink.db.cropListings.delete(listingId);
      toast.success('Listing deleted permanently');
      fetchAllListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    } finally {
      setProcessingId(null);
    }
  };

  const renderListingRow = (listing: CropListing, showActions: boolean = true, actionType: 'approve' | 'manage' = 'approve') => (
    <TableRow key={listing.id}>
      <TableCell>
        <div>
          <div className="font-medium">{listing.cropName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(listing.createdAt), 'MMM dd, yyyy')}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{listing.sellerName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {listing.sellerPhone}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {listing.sellerLocation}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{listing.quantity} {listing.unit}</span>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="flex items-center gap-1">
            <IndianRupee className="w-3 h-3" />
            <span className="font-medium">{listing.pricePerUnit}</span>
            <span className="text-xs text-muted-foreground">/{listing.unit}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Total: ₹{listing.totalPrice.toFixed(2)}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {listing.description ? (
          <div className="text-sm max-w-xs line-clamp-2">{listing.description}</div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      {showActions && (
        <TableCell>
          <div className="flex items-center gap-2">
            {actionType === 'approve' ? (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprove(listing.id)}
                  disabled={processingId === listing.id}
                  className="gap-1"
                >
                  {processingId === listing.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(listing.id)}
                  disabled={processingId === listing.id}
                  className="gap-1"
                >
                  <X className="w-4 h-4" />
                  Reject
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(listing.id)}
                disabled={processingId === listing.id}
                className="gap-1"
              >
                <X className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Crop Listings Management</h1>
        <p className="text-muted-foreground">Review and approve farmer crop listings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingListings.length}</div>
            <Badge variant="secondary" className="mt-2">Requires Action</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{approvedListings.length}</div>
            <Badge variant="default" className="mt-2">Live on Marketplace</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{rejectedListings.length}</div>
            <Badge variant="destructive" className="mt-2">Not Visible</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingListings.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedListings.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedListings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Listings - Awaiting Approval</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : pendingListings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop & Date</TableHead>
                      <TableHead>Seller Details</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingListings.map((listing) => renderListingRow(listing, true, 'approve'))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Check className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Listings</h3>
                  <p className="text-muted-foreground">All listings have been reviewed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Approved Listings - Live on Marketplace</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : approvedListings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop & Date</TableHead>
                      <TableHead>Seller Details</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedListings.map((listing) => renderListingRow(listing, true, 'manage'))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Approved Listings</h3>
                  <p className="text-muted-foreground">Approve pending listings to see them here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Listings</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : rejectedListings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop & Date</TableHead>
                      <TableHead>Seller Details</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedListings.map((listing) => renderListingRow(listing, true, 'manage'))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <X className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Rejected Listings</h3>
                  <p className="text-muted-foreground">Rejected listings will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

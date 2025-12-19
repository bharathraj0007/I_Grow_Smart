import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { blink } from '@/lib/blink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Package, 
  IndianRupee, 
  Calendar, 
  Phone, 
  MapPin, 
  User,
  Loader2,
  Check,
  Truck,
  AlertCircle,
  Clock,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { createWhatsAppLink } from '@/utils/whatsappHelper';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  deliveryAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryStatus: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  id: string;
  orderId: string;
  listingId: string;
  cropName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  sellerName: string;
  sellerPhone: string;
  sellerLocation: string;
  sellerId?: string;
  createdAt: string;
}

interface OrderWithItems extends Order {
  items: OrderItem[];
}

export default function MyOrdersPage() {
  const { user, profile, login } = useAuth();
  const [buyerOrders, setBuyerOrders] = useState<OrderWithItems[]>([]);
  const [sellerOrders, setSellerOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    try {
      // Fetch orders as buyer
      const ordersAsBuyer = await blink.db.orders.list<Order>({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        limit: 100
      });

      // Fetch order items for buyer orders
      const buyerOrdersWithItems = await Promise.all(
        ordersAsBuyer.map(async (order) => {
          const items = await blink.db.orderItems.list<OrderItem>({
            where: { orderId: order.id },
            limit: 100
          });
          return { ...order, items };
        })
      );

      setBuyerOrders(buyerOrdersWithItems);

      // Fetch orders where user is a seller
      // Method 1: Match by seller_id (preferred, for new orders)
      // Method 2: Match by seller phone (fallback for legacy orders)
      
      const userPhone = (profile.phoneNumber || '').trim();

      // Normalize phone number: remove spaces, dashes, and special characters
      const normalizePhone = (phone: string) => {
        return phone.replace(/[\s\-\(\)]+/g, '').slice(-10); // Get last 10 digits
      };

      const normalizedUserPhone = userPhone ? normalizePhone(userPhone) : '';

      // Fetch all order items (limit is high to get all)
      const allOrderItems = await blink.db.orderItems.list<OrderItem>({
        orderBy: { createdAt: 'desc' },
        limit: 1000,
      });

      // Filter order items where:
      // 1. seller_id matches user.id (new orders) OR
      // 2. seller phone matches user phone (legacy orders)
      const matchedOrderItems = allOrderItems.filter((item) => {
        // Get seller_id from either camelCase or snake_case property (SDK may return either)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemSellerId = item.sellerId || (item as any).seller_id || '';
        
        // Primary match: by seller_id
        if (itemSellerId && itemSellerId === user.id) {
          return true;
        }
        
        // Fallback match: by phone number (for legacy orders without seller_id)
        if (normalizedUserPhone && item.sellerPhone) {
          const normalizedSellerPhone = normalizePhone(item.sellerPhone);
          return normalizedSellerPhone === normalizedUserPhone;
        }
        
        return false;
      });

      console.log('Seller Order Retrieval Debug:', {
        userId: user.id,
        userPhone,
        normalizedUserPhone,
        totalOrderItems: allOrderItems.length,
        matchedOrderItems: matchedOrderItems.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        matchedByUserId: allOrderItems.filter(item => (item.sellerId || (item as any).seller_id) === user.id).length,
        matchedByPhone: normalizedUserPhone ? allOrderItems.filter(item => {
          const normalizedSellerPhone = normalizePhone(item.sellerPhone || '');
          return normalizedSellerPhone === normalizedUserPhone;
        }).length : 0,
        sampleOrderItems: allOrderItems.slice(0, 3).map(item => ({
          sellerId: item.sellerId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          seller_id_raw: (item as any).seller_id,
          sellerPhone: item.sellerPhone,
          normalized: normalizePhone(item.sellerPhone || ''),
          // Show all keys of item for debugging
          allKeys: Object.keys(item)
        }))
      });

      // Group matched order items by order_id
      const orderItemsByOrderId = new Map<string, OrderItem[]>();
      matchedOrderItems.forEach((item) => {
        if (!orderItemsByOrderId.has(item.orderId)) {
          orderItemsByOrderId.set(item.orderId, []);
        }
        orderItemsByOrderId.get(item.orderId)!.push(item);
      });

      // Fetch full order details for seller orders
      const uniqueOrderIds = Array.from(orderItemsByOrderId.keys());
      if (uniqueOrderIds.length > 0) {
        const sellerOrdersData = await Promise.all(
          uniqueOrderIds.map(async (orderId) => {
            const order = await blink.db.orders.get<Order>(orderId);
            if (order) {
              return { 
                ...order, 
                items: orderItemsByOrderId.get(orderId) || [] 
              };
            }
            return null;
          })
        );

        // Sort by createdAt descending
        const sortedSellerOrders = sellerOrdersData
          .filter((o): o is OrderWithItems => o !== null)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setSellerOrders(sortedSellerOrders);
      } else {
        setSellerOrders([]);
      }

    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeliveryStatus = async (orderId: string, itemId: string, newStatus: string) => {
    setProcessingId(itemId);
    try {
      // Update the main order delivery status
      await blink.db.orders.update(orderId, {
        deliveryStatus: newStatus,
        updatedAt: new Date().toISOString()
      });

      toast.success(`Order marked as ${newStatus}!`);
      await fetchOrders();
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast.error('Failed to update delivery status');
    } finally {
      setProcessingId(null);
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleDeleteOrder = async (orderId: string, isSeller: boolean, deliveryStatus: string) => {
    // Check if product is delivered before allowing deletion
    if (deliveryStatus !== 'delivered') {
      toast.error(
        isSeller 
          ? 'Cannot delete sale until product is delivered to buyer' 
          : 'Cannot delete purchase until product is delivered'
      );
      return;
    }

    setProcessingId(orderId);
    try {
      // Delete all order items first
      const orderItems = await blink.db.orderItems.list<OrderItem>({
        where: { orderId: orderId },
        limit: 100
      });

      // Delete each order item
      for (const item of orderItems) {
        await blink.db.orderItems.delete(item.id);
      }

      // Delete the order
      await blink.db.orders.delete(orderId);

      toast.success(isSeller ? 'Sale deleted successfully!' : 'Purchase deleted successfully!');
      await fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactNode, label: string }> = {
      pending: { variant: 'secondary', icon: <Clock className="w-3 h-3" />, label: 'Pending' },
      processing: { variant: 'default', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Processing' },
      shipped: { variant: 'default', icon: <Truck className="w-3 h-3" />, label: 'Shipped' },
      delivered: { variant: 'default', icon: <Check className="w-3 h-3" />, label: 'Delivered' },
      cancelled: { variant: 'destructive', icon: <AlertCircle className="w-3 h-3" />, label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const renderOrderCard = (orderWithItems: OrderWithItems, isSeller: boolean = false) => {
    const isExpanded = expandedOrders.has(orderWithItems.id);
    
    return (
      <Card key={orderWithItems.id} className="overflow-hidden">
        <Collapsible open={isExpanded} onOpenChange={() => toggleOrderExpansion(orderWithItems.id)}>
          <CardHeader className="bg-muted/30">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-lg">Order #{orderWithItems.orderNumber}</CardTitle>
                  {getStatusBadge(orderWithItems.deliveryStatus)}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(orderWithItems.createdAt), 'MMM dd, yyyy hh:mm a')}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <IndianRupee className="w-4 h-4" />
                    {orderWithItems.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-6">
              {/* Buyer/Seller Info */}
              {isSeller ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Buyer Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {orderWithItems.buyerName}</p>
                    <p className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <strong>Phone:</strong> {orderWithItems.buyerPhone}
                    </p>
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <strong>Address:</strong> {orderWithItems.deliveryAddress}
                    </p>
                    {orderWithItems.notes && (
                      <p><strong>Notes:</strong> {orderWithItems.notes}</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Order Items */}
              <div className="space-y-3 mb-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Items in Order
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderWithItems.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.cropName}</TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>₹{item.pricePerUnit}/{item.unit}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{item.sellerName}</div>
                            <div className="text-xs text-muted-foreground">{item.sellerPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">₹{item.totalPrice.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                {isSeller ? (
                  <>
                    {orderWithItems.deliveryStatus === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateDeliveryStatus(orderWithItems.id, orderWithItems.items[0]?.id, 'processing')}
                        disabled={processingId === orderWithItems.items[0]?.id}
                        className="gap-1"
                      >
                        {processingId === orderWithItems.items[0]?.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                        Mark Processing
                      </Button>
                    )}
                    {(orderWithItems.deliveryStatus === 'pending' || orderWithItems.deliveryStatus === 'processing') && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateDeliveryStatus(orderWithItems.id, orderWithItems.items[0]?.id, 'shipped')}
                        disabled={processingId === orderWithItems.items[0]?.id}
                        className="gap-1"
                      >
                        {processingId === orderWithItems.items[0]?.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Truck className="w-4 h-4" />
                        )}
                        Mark Shipped
                      </Button>
                    )}
                    {(orderWithItems.deliveryStatus === 'shipped' || orderWithItems.deliveryStatus === 'processing') && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleUpdateDeliveryStatus(orderWithItems.id, orderWithItems.items[0]?.id, 'delivered')}
                        disabled={processingId === orderWithItems.items[0]?.id}
                        className="gap-1 bg-green-600 hover:bg-green-700"
                      >
                        {processingId === orderWithItems.items[0]?.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Mark Delivered
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const whatsappLink = createWhatsAppLink({
                          phoneNumber: orderWithItems.buyerPhone,
                          cropName: orderWithItems.items[0]?.cropName,
                          quantity: orderWithItems.items[0]?.quantity,
                          unit: orderWithItems.items[0]?.unit,
                          price: orderWithItems.totalAmount,
                          buyerName: orderWithItems.buyerName,
                          orderNumber: orderWithItems.orderNumber
                        });
                        window.open(whatsappLink, '_blank', 'noopener,noreferrer');
                      }}
                      className="gap-1"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contact Buyer
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={processingId === orderWithItems.id || orderWithItems.deliveryStatus !== 'delivered'}
                          className="gap-1 ml-auto"
                          title={orderWithItems.deliveryStatus !== 'delivered' ? 'Cannot delete until product is delivered' : ''}
                        >
                          {processingId === orderWithItems.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete Sale
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Sale</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this sale? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex gap-3">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteOrder(orderWithItems.id, true, orderWithItems.deliveryStatus)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const item = orderWithItems.items[0];
                        if (item) {
                          const whatsappLink = createWhatsAppLink({
                            phoneNumber: item.sellerPhone,
                            cropName: item.cropName,
                            quantity: item.quantity,
                            unit: item.unit,
                            price: orderWithItems.totalAmount,
                            buyerName: orderWithItems.buyerName,
                            orderNumber: orderWithItems.orderNumber
                          });
                          window.open(whatsappLink, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="gap-1"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contact Seller
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={processingId === orderWithItems.id || orderWithItems.deliveryStatus !== 'delivered'}
                          className="gap-1 ml-auto"
                          title={orderWithItems.deliveryStatus !== 'delivered' ? 'Cannot delete until product is delivered' : ''}
                        >
                          {processingId === orderWithItems.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete Purchase
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this purchase? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex gap-3">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteOrder(orderWithItems.id, false, orderWithItems.deliveryStatus)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-4">Sign in Required</h2>
        <p className="text-muted-foreground mb-6">Please sign in to view your orders</p>
        <Button onClick={() => login(window.location.href)}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">Manage your purchases and sales</p>
        </div>

        <Tabs defaultValue="purchases" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="purchases">
              My Purchases ({buyerOrders.length})
            </TabsTrigger>
            <TabsTrigger value="sales">
              My Sales ({sellerOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases">
            <div className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </CardContent>
                </Card>
              ) : buyerOrders.length > 0 ? (
                buyerOrders.map((order) => renderOrderCard(order, false))
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Purchases Yet</h3>
                    <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
                    <Button onClick={() => window.location.href = '/marketing'}>
                      Browse Marketplace
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sales">
            <div className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </CardContent>
                </Card>
              ) : sellerOrders.length > 0 ? (
                sellerOrders.map((order) => renderOrderCard(order, true))
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Truck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Sales Yet</h3>
                    <p className="text-muted-foreground mb-6">List your crops to start receiving orders</p>
                    <Button onClick={() => window.location.href = '/marketing'}>
                      Create Listing
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

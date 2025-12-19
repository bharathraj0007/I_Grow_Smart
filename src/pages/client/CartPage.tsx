import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { blink } from '@/lib/blink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Package, 
  IndianRupee, 
  MapPin,
  Phone,
  User,
  CreditCard,
  CheckCircle,
  ShoppingBag,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { createWhatsAppLink } from '@/utils/whatsappHelper';

export default function CartPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { items, removeFromCart, updateQuantity, clearCart, getTotalPrice } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderDetails, setPlacedOrderDetails] = useState<{
    orderNumber: string;
    items: Array<{
      cropName: string;
      quantity: number;
      unit: string;
      totalPrice: number;
      sellerName: string;
      sellerPhone: string;
      sellerLocation: string;
    }>;
    buyerName: string;
  } | null>(null);

  // Checkout form state
  const [checkoutData, setCheckoutData] = useState({
    buyerName: '',
    buyerPhone: '',
    deliveryAddress: '',
    paymentMethod: 'cash',
    notes: ''
  });

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to checkout');
      login(window.location.href);
      return;
    }

    // Validate form
    if (!checkoutData.buyerName || !checkoutData.buyerPhone || !checkoutData.deliveryAddress) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCheckingOut(true);

    try {
      // Generate unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create main order
      const orderResult = await blink.db.orders.create({
        user_id: user.id,
        order_number: orderNumber,
        buyer_name: checkoutData.buyerName,
        buyer_phone: checkoutData.buyerPhone,
        delivery_address: checkoutData.deliveryAddress,
        payment_method: checkoutData.paymentMethod,
        payment_status: 'pending',
        delivery_status: 'pending',
        total_amount: getTotalPrice(),
        notes: checkoutData.notes || ''
      });

      if (!orderResult || !orderResult.id) {
        throw new Error('Failed to create order - no order ID returned');
      }

      const orderId = orderResult.id;

      // Create order items
      const orderItemPromises = items.map(async (item) => {
        // Use sellerId from cart item (stored when item was added to cart)
        // Fallback: fetch from listing if not available (for legacy cart items)
        let sellerId = item.sellerId || '';
        if (!sellerId) {
          try {
            const listing = await blink.db.cropListings.get(item.listingId);
            if (listing && listing.userId) {
              sellerId = listing.userId as string;
            }
          } catch (e) {
            console.error('Error fetching listing for seller_id:', e);
          }
        }

        console.log('Creating order item with seller_id:', sellerId, 'for crop:', item.cropName);

        await blink.db.orderItems.create({
          order_id: orderId,
          listing_id: item.listingId,
          crop_name: item.cropName,
          quantity: item.quantity,
          unit: item.unit,
          price_per_unit: item.pricePerUnit,
          total_price: item.quantity * item.pricePerUnit,
          seller_name: item.sellerName,
          seller_phone: item.sellerPhone,
          seller_location: item.sellerLocation,
          seller_id: sellerId
        });

        // Send email notification to seller (if available)
        try {
          await blink.notifications.email({
            to: `seller@example.com`, // This should come from the listing
            subject: `New Order for ${item.cropName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🛒 New Order Received!</h1>
                </div>
                
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #1f2937; margin-top: 0;">Order Details</h2>
                  
                  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Crop:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${item.cropName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Quantity:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${item.quantity} ${item.unit}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Price per ${item.unit}:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">₹${item.pricePerUnit}</td>
                      </tr>
                      <tr style="border-top: 2px solid #e5e7eb;">
                        <td style="padding: 12px 0; color: #1f2937; font-weight: 600; font-size: 18px;">Total Amount:</td>
                        <td style="padding: 12px 0; color: #10b981; font-weight: 700; font-size: 20px; text-align: right;">₹${(item.quantity * item.pricePerUnit).toFixed(2)}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <h3 style="color: #1f2937; margin-bottom: 10px;">Buyer Information</h3>
                  <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 4px;">
                    <p style="margin: 5px 0; color: #1e3a8a;"><strong>Name:</strong> ${checkoutData.buyerName}</p>
                    <p style="margin: 5px 0; color: #1e3a8a;"><strong>Phone:</strong> ${checkoutData.buyerPhone}</p>
                    <p style="margin: 5px 0; color: #1e3a8a;"><strong>Delivery Address:</strong> ${checkoutData.deliveryAddress}</p>
                    ${checkoutData.notes ? `<p style="margin: 5px 0; color: #1e3a8a;"><strong>Notes:</strong> ${checkoutData.notes}</p>` : ''}
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    Please contact the buyer to arrange delivery and payment details.
                  </p>
                </div>
              </div>
            `,
            text: `New Order Received!\n\nOrder Details:\n- Crop: ${item.cropName}\n- Quantity: ${item.quantity} ${item.unit}\n- Price per ${item.unit}: ₹${item.pricePerUnit}\n- Total Amount: ₹${(item.quantity * item.pricePerUnit).toFixed(2)}\n\nBuyer Information:\nName: ${checkoutData.buyerName}\nPhone: ${checkoutData.buyerPhone}\nAddress: ${checkoutData.deliveryAddress}\n${checkoutData.notes ? `Notes: ${checkoutData.notes}` : ''}`
          });
        } catch (emailError) {
          console.error('Failed to send seller notification:', emailError);
        }

        return true;
      });

      await Promise.all(orderItemPromises);

      // Step: Send seller notifications via edge function for each unique seller
      const uniqueSellers = new Map<string, typeof items>();
      items.forEach(item => {
        if (!uniqueSellers.has(item.sellerPhone)) {
          uniqueSellers.set(item.sellerPhone, []);
        }
        uniqueSellers.get(item.sellerPhone)!.push(item);
      });

      // Send notification for each seller
      const notificationPromises = Array.from(uniqueSellers.entries()).map(([sellerPhone, sellerItems]) => {
        const seller = sellerItems[0];
        return fetch('https://m80q4b8r--seller-notification.functions.blink.new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            orderNumber,
            sellerPhone,
            sellerName: seller.sellerName,
            buyerName: checkoutData.buyerName,
            buyerPhone: checkoutData.buyerPhone,
            deliveryAddress: checkoutData.deliveryAddress,
            items: sellerItems.map(item => ({
              cropName: item.cropName,
              quantity: item.quantity,
              unit: item.unit,
              pricePerUnit: item.pricePerUnit,
              totalPrice: item.quantity * item.pricePerUnit
            })),
            notes: checkoutData.notes || ''
          })
        })
          .then(res => res.json())
          .then(data => {
            console.log('Seller notification result:', data);
            if (data.sellerEmailFound) {
              console.log(`✓ Seller ${seller.sellerName} notification processed`);
            }
          })
          .catch(notifError => {
            console.error(`Failed to send notification to seller ${seller.sellerName}:`, notifError);
          });
      });

      await Promise.all(notificationPromises);

      // Store order details for WhatsApp integration
      setPlacedOrderDetails({
        orderNumber,
        items: items.map(item => ({
          cropName: item.cropName,
          quantity: item.quantity,
          unit: item.unit,
          totalPrice: item.quantity * item.pricePerUnit,
          sellerName: item.sellerName,
          sellerPhone: item.sellerPhone,
          sellerLocation: item.sellerLocation
        })),
        buyerName: checkoutData.buyerName
      });

      // Show success without clearing cart
      setOrderPlaced(true);
      toast.success('Order placed successfully! Sellers have been notified.');

    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (orderPlaced && placedOrderDetails) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-8 mb-6">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-green-700 mb-2 text-center">Order Placed Successfully!</h1>
            <p className="text-center text-gray-600 mb-4">Order #{placedOrderDetails.orderNumber}</p>
            <p className="text-lg text-gray-700 mb-6 text-center">
              Your order has been confirmed. Connect with sellers via WhatsApp to arrange delivery and payment.
            </p>
          </div>

          {/* Seller Contact Cards */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Contact Sellers</h2>
            <div className="space-y-4">
              {placedOrderDetails.items.map((item, index) => (
                <Card key={index} className="border-2 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{item.cropName}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Quantity: {item.quantity} {item.unit}
                          </p>
                          <p className="flex items-center gap-2">
                            <IndianRupee className="w-4 h-4" />
                            Total: ₹{item.totalPrice.toFixed(2)}
                          </p>
                          <p className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Seller: {item.sellerName}
                          </p>
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Location: {item.sellerLocation}
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Phone: {item.sellerPhone || 'Not available'}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white md:min-w-[200px]"
                        onClick={() => {
                          const whatsappLink = createWhatsAppLink({
                            phoneNumber: item.sellerPhone,
                            cropName: item.cropName,
                            quantity: item.quantity,
                            unit: item.unit,
                            price: item.totalPrice,
                            buyerName: placedOrderDetails.buyerName,
                            orderNumber: placedOrderDetails.orderNumber
                          });
                          window.open(whatsappLink, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Contact on WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg border p-6">
            <div className="space-y-3">
              <Button onClick={() => navigate('/marketing')} className="w-full" size="lg">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Continue Shopping
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full" size="lg">
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <ShoppingCart className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">
            Add some crops to your cart to get started!
          </p>
          <Button onClick={() => navigate('/marketing')} size="lg">
            <ShoppingBag className="w-5 h-5 mr-2" />
            Browse Crops
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Shopping Cart</h1>
          <p className="text-muted-foreground">Review your items and proceed to checkout</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.listingId}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Crop Image */}
                    <div className="flex-shrink-0 w-24 h-24 bg-primary/5 rounded-lg flex items-center justify-center overflow-hidden">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.cropName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3E' + item.cropName.charAt(0) + '%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <Package className="w-12 h-12 text-primary/40" />
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{item.cropName}</h3>
                          <div className="space-y-1 mt-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Seller: {item.sellerName}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {item.sellerPhone || 'Not available'}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.sellerLocation}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.listingId)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.listingId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-12 text-center font-semibold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.listingId, item.quantity + 1)}
                            disabled={item.quantity >= item.maxQuantity}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm text-muted-foreground ml-2">{item.unit}</span>
                        </div>
                        
                        <Badge variant="secondary">
                          <IndianRupee className="w-3 h-3" />
                          {item.pricePerUnit}/{item.unit}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Max: {item.maxQuantity} {item.unit} available
                        </span>
                        <span className="text-lg font-bold text-primary">
                          ₹{(item.quantity * item.pricePerUnit).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={clearCart}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          </div>

          {/* Order Summary & Checkout */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{getTotalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-semibold text-green-600">To be arranged</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">₹{getTotalPrice().toFixed(2)}</span>
                  </div>
                </div>

                {!showCheckout ? (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => {
                      if (!user) {
                        toast.error('Please sign in to checkout');
                        login(window.location.href);
                        return;
                      }
                      setShowCheckout(true);
                    }}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Proceed to Checkout
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {/* Checkout Form */}
            {showCheckout && (
              <Card>
                <CardHeader>
                  <CardTitle>Checkout Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="buyerName">
                      <User className="w-4 h-4 inline mr-1" />
                      Full Name *
                    </Label>
                    <Input
                      id="buyerName"
                      required
                      value={checkoutData.buyerName}
                      onChange={(e) => setCheckoutData({ ...checkoutData, buyerName: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="buyerPhone">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Contact Phone *
                    </Label>
                    <Input
                      id="buyerPhone"
                      type="tel"
                      required
                      value={checkoutData.buyerPhone}
                      onChange={(e) => setCheckoutData({ ...checkoutData, buyerPhone: e.target.value })}
                      placeholder="Your phone number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="deliveryAddress">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Delivery Address *
                    </Label>
                    <Textarea
                      id="deliveryAddress"
                      required
                      value={checkoutData.deliveryAddress}
                      onChange={(e) => setCheckoutData({ ...checkoutData, deliveryAddress: e.target.value })}
                      placeholder="Full delivery address with village, district, state, pincode"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={checkoutData.notes}
                      onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
                      placeholder="Any specific delivery instructions or requirements"
                      rows={2}
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      <strong>Payment:</strong> Cash on Delivery / Direct to Seller
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      The seller will contact you to arrange payment and delivery details.
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Place Order
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCheckout(false)}
                    disabled={isCheckingOut}
                  >
                    Back to Cart
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

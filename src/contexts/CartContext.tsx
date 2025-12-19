import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

interface CartItem {
  listingId: string;
  cropName: string;
  sellerName: string;
  sellerPhone: string;
  sellerLocation: string;
  sellerId: string; // Seller's user_id for tracking sales
  quantity: number;
  maxQuantity: number;
  unit: string;
  pricePerUnit: number;
  imageUrl?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (listingId: string) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isInCart: (listingId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  // Generate user-specific cart storage key
  const getCartStorageKey = () => {
    if (!user) return 'agri_cart_guest'; // Guest cart
    return `agri_cart_${user.id}`; // User-specific cart
  };

  // Load cart from localStorage when user changes
  useEffect(() => {
    const cartKey = getCartStorageKey();
    const savedCart = localStorage.getItem(cartKey);
    
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
        console.log(`✅ Loaded cart for ${user ? 'user ' + user.id : 'guest'}`);
      } catch (error) {
        console.error('Error loading cart:', error);
        setItems([]);
      }
    } else {
      // Clear cart if no saved cart for this user
      setItems([]);
    }
  }, [user?.id]); // Re-load when user changes

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    const cartKey = getCartStorageKey();
    localStorage.setItem(cartKey, JSON.stringify(items));
  }, [items, user?.id]);

  const addToCart = (item: CartItem) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(i => i.listingId === item.listingId);
      
      if (existingItem) {
        // Update quantity if item already in cart
        const newQuantity = existingItem.quantity + item.quantity;
        if (newQuantity > item.maxQuantity) {
          toast.error(`Maximum available quantity is ${item.maxQuantity} ${item.unit}`);
          return prevItems;
        }
        
        toast.success(`Updated ${item.cropName} quantity in cart`);
        return prevItems.map(i =>
          i.listingId === item.listingId
            ? { ...i, quantity: newQuantity }
            : i
        );
      } else {
        // Add new item
        toast.success(`${item.cropName} added to cart`);
        return [...prevItems, item];
      }
    });
  };

  const removeFromCart = (listingId: string) => {
    setItems(prevItems => {
      const item = prevItems.find(i => i.listingId === listingId);
      if (item) {
        toast.success(`${item.cropName} removed from cart`);
      }
      return prevItems.filter(i => i.listingId !== listingId);
    });
  };

  const updateQuantity = (listingId: string, quantity: number) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.listingId === listingId) {
          if (quantity > item.maxQuantity) {
            toast.error(`Maximum available quantity is ${item.maxQuantity} ${item.unit}`);
            return item;
          }
          if (quantity < 1) {
            toast.error('Quantity must be at least 1');
            return item;
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    toast.success('Cart cleared');
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.quantity * item.pricePerUnit), 0);
  };

  const isInCart = (listingId: string) => {
    return items.some(item => item.listingId === listingId);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        isInCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

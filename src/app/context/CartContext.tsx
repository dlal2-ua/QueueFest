import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorType: 'food-truck' | 'bar';
  name: string;
  price: number;
  quantity: number;
  description?: string;
  extras?: string[];
}

export interface AddItemResult {
  ok: boolean;
  reason?: 'different_vendor';
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => AddItemResult;
  removeItem: (id: string, vendorId?: string) => void;
  updateQuantity: (id: string, quantity: number, vendorId?: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  applyCoupon: (code: string) => void;
  discount: number;
  couponCode: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem): AddItemResult => {
    const sanitizedItem = {
      ...item,
      price: Number(item.price),
      quantity: item.quantity || 1
    };

    let result: AddItemResult = { ok: true };

    setItems((prev) => {
      // El flujo actual de pago procesa un solo puesto por pedido.
      if (prev.length > 0 && prev.some((existingItem) => existingItem.vendorId !== sanitizedItem.vendorId)) {
        result = { ok: false, reason: 'different_vendor' };
        return prev;
      }

      const existingIndex = prev.findIndex((existingItem) =>
        existingItem.id === sanitizedItem.id && existingItem.vendorId === sanitizedItem.vendorId
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += sanitizedItem.quantity;
        return updated;
      }

      return [...prev, sanitizedItem];
    });

    return result;
  };

  const removeItem = (id: string, vendorId?: string) => {
    setItems((prev) => prev.filter((item) => !(item.id === id && (!vendorId || item.vendorId === vendorId))));
  };

  const updateQuantity = (id: string, quantity: number, vendorId?: string) => {
    if (quantity <= 0) {
      removeItem(id, vendorId);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id && (!vendorId || item.vendorId === vendorId)
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setDiscount(0);
    setCouponCode(null);
  };

  const getTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.max(0, subtotal - discount);
  };

  const getItemCount = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const applyCoupon = (code: string) => {
    const coupons: Record<string, number> = {
      'SAVE10': 10,
      'SAVE20': 20,
      'WELCOME': 5,
      'FIRSTORDER': 15
    };

    const discountAmount = coupons[code.toUpperCase()];
    if (discountAmount) {
      setDiscount(discountAmount);
      setCouponCode(code.toUpperCase());
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotal,
        getItemCount,
        applyCoupon,
        discount,
        couponCode
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

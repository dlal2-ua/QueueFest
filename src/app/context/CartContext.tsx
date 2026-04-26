import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: string;
  productId?: string;
  promotionId?: string;
  promotionType?: string;
  promotionLabel?: string;
  unitsPerPromotion?: number;
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

const CART_STORAGE_KEY = 'cart';
const CART_STORAGE_VERSION_KEY = 'cartVersion';
const CART_STORAGE_VERSION = 2;

export function getCartItemStep(item: Pick<CartItem, 'promotionId' | 'unitsPerPromotion'>) {
  const unitsPerPromotion = Number(item.unitsPerPromotion ?? 1);

  if (!item.promotionId || !Number.isFinite(unitsPerPromotion) || unitsPerPromotion <= 1) {
    return 1;
  }

  return Math.max(1, Math.round(unitsPerPromotion));
}

function normalizeRealQuantity(quantity: number, step: number) {
  const numericQuantity = Math.floor(Number(quantity) || 0);

  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
    return 0;
  }

  if (step === 1) {
    return numericQuantity;
  }

  return Math.max(step, Math.ceil(numericQuantity / step) * step);
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeStoredCartItem(
  rawItem: any,
  options: { legacyBundleMode?: boolean } = {}
): CartItem | null {
  if (!rawItem || typeof rawItem !== 'object') return null;

  const baseItem = rawItem as CartItem;
  const step = getCartItemStep(baseItem);
  const rawQuantity = Math.floor(Number(baseItem.quantity) || 0);
  const quantity = options.legacyBundleMode && step > 1
    ? normalizeRealQuantity(rawQuantity * step, step)
    : normalizeRealQuantity(rawQuantity, step);
  const price = Number(baseItem.price);

  if (!baseItem.id || !baseItem.vendorId || !baseItem.vendorName || !baseItem.vendorType || !baseItem.name) {
    return null;
  }

  if (quantity <= 0 || !Number.isFinite(price) || price < 0) {
    return null;
  }

  return {
    ...baseItem,
    price,
    quantity
  };
}

function readStoredCart() {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) return [];

    const parsedCart = JSON.parse(savedCart);
    if (!Array.isArray(parsedCart)) return [];

    const storedVersion = Number(localStorage.getItem(CART_STORAGE_VERSION_KEY) || 1);

    return parsedCart
      .map((item) => normalizeStoredCartItem(item, { legacyBundleMode: storedVersion < CART_STORAGE_VERSION }))
      .filter((item): item is CartItem => item != null);
  } catch {
    return [];
  }
}

function normalizeIncomingCartItem(item: CartItem): CartItem {
  const step = getCartItemStep(item);
  const rawQuantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
  const realQuantity = step > 1
    ? normalizeRealQuantity(rawQuantity * step, step)
    : normalizeRealQuantity(rawQuantity, step);

  return {
    ...item,
    price: Number(item.price),
    quantity: realQuantity
  };
}

export function getCartItemDisplayQuantity(item: Pick<CartItem, 'quantity' | 'promotionId' | 'unitsPerPromotion'>) {
  return normalizeRealQuantity(Number(item.quantity), getCartItemStep(item));
}

export function getCartItemApplications(item: Pick<CartItem, 'quantity' | 'promotionId' | 'unitsPerPromotion'>) {
  const step = getCartItemStep(item);
  const quantity = getCartItemDisplayQuantity(item);

  return step > 1 ? quantity / step : quantity;
}

export function getCartItemLineTotal(item: Pick<CartItem, 'price' | 'quantity' | 'promotionId' | 'unitsPerPromotion'>) {
  return roundCurrency(Number(item.price) * getCartItemApplications(item));
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
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(CART_STORAGE_VERSION_KEY, String(CART_STORAGE_VERSION));
  }, [items]);

  const addItem = (item: CartItem): AddItemResult => {
    const sanitizedItem = normalizeIncomingCartItem(item);

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
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + sanitizedItem.quantity
        };
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
          ? { ...item, quantity: normalizeRealQuantity(quantity, getCartItemStep(item)) }
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
    const subtotal = items.reduce((sum, item) => sum + getCartItemLineTotal(item), 0);
    return Math.max(0, subtotal - discount);
  };

  const getItemCount = () => {
    return items.reduce((sum, item) => sum + getCartItemDisplayQuantity(item), 0);
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

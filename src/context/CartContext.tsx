import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Product, products } from "@/data/products";

export interface CartItem {
  product: Product;
  qty: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQty: (productId: number, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cart-items";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const stored: { productId: number; qty: number }[] = JSON.parse(raw);
    if (!Array.isArray(stored)) return [];
    return stored
      .map(({ productId, qty }) => {
        const product = products.find((p) => p.id === productId);
        const safeQty = Number.isFinite(qty) ? Math.max(1, Math.min(99, Math.floor(qty))) : 1;
        return product ? { product, qty: safeQty } : null;
      })
      .filter(Boolean) as CartItem[];
  } catch {
    return [];
  }
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    const toStore = items.map((i) => ({ productId: i.product.id, qty: i.qty }));
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      /* ignore storage errors */
    }
  }, [items]);

  const addToCart = useCallback((product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        toast.success(`Updated ${product.name} quantity`);
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + qty } : i
        );
      }
      toast.success(`${product.name} added to cart`);
      return [...prev, { product, qty }];
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setItems((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (item) toast("Removed from cart", { description: item.product.name });
      return prev.filter((i) => i.product.id !== productId);
    });
  }, []);

  const updateQty = useCallback((productId: number, qty: number) => {
    if (qty < 1) return;
    const safeQty = Math.min(99, Math.floor(qty));
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, qty: safeQty } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems((prev) => {
      if (prev.length > 0) toast("Cart cleared");
      return [];
    });
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

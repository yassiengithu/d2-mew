import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubmittedProductStatus = "Pending Approval" | "Approved" | "Rejected";

export interface SubmittedProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  sellerName: string;
  /** ID of the seller account that submitted the product. */
  sellerId?: string | null;
  imageUrl: string;
  /** Optional link to an external listing (Shopee, Lazada, etc.). */
  externalUrl?: string;
  status: SubmittedProductStatus;
  createdAt: number;
  /** Whether the seller has marked this product as featured. */
  featured?: boolean;
  /** Paid promotion flag — set by admin/billing after a successful promotion purchase. */
  is_featured?: boolean;
}

export type EditableSubmittedProductFields = Pick<SubmittedProduct, "name" | "price" | "description">;

interface SubmittedProductsContextValue {
  products: SubmittedProduct[];
  /** All submissions (admin view, not filtered by seller). */
  allProducts: SubmittedProduct[];
  addProduct: (p: Omit<SubmittedProduct, "id" | "status" | "createdAt" | "sellerId">) => SubmittedProduct;
  updateProduct: (id: string, updates: Partial<EditableSubmittedProductFields>) => void;
  removeProduct: (id: string) => void;
  setFeatured: (id: string, featured: boolean) => void;
  setIsFeatured: (id: string, isFeatured: boolean) => void;
  /** Admin moderation: approve or reject any submission. */
  setStatus: (id: string, status: SubmittedProductStatus) => void;
  /** Admin moderation: permanently remove any submission, regardless of seller. */
  adminRemoveProduct: (id: string) => void;
}

const STORAGE_KEY = "submitted_products_v1";

const SubmittedProductsContext = createContext<SubmittedProductsContextValue | undefined>(undefined);

export const SubmittedProductsProvider = ({ children }: { children: ReactNode }) => {
  const [allProducts, setAllProducts] = useState<SubmittedProduct[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SubmittedProduct[]) : [];
    } catch {
      return [];
    }
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allProducts));
    } catch {
      /* no-op */
    }
  }, [allProducts]);

  // Only show submissions belonging to the current user.
  // Legacy entries without a sellerId remain visible to signed-in users.
  const products = useMemo(
    () =>
      userId
        ? allProducts.filter((p) => !p.sellerId || p.sellerId === userId)
        : [],
    [allProducts, userId],
  );

  const value = useMemo<SubmittedProductsContextValue>(
    () => ({
      products,
      allProducts,
      addProduct: (p) => {
        const next: SubmittedProduct = {
          ...p,
          sellerId: userId,
          id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          status: "Pending Approval",
          createdAt: Date.now(),
          featured: false,
          is_featured: false,
        };
        setAllProducts((prev) => [next, ...prev]);
        return next;
      },
      updateProduct: (id, updates) =>
        setAllProducts((prev) =>
          prev.map((p) =>
            p.id === id && (!p.sellerId || p.sellerId === userId) ? { ...p, ...updates } : p,
          ),
        ),
      removeProduct: (id) =>
        setAllProducts((prev) =>
          prev.filter((p) => !(p.id === id && (!p.sellerId || p.sellerId === userId))),
        ),
      setFeatured: (id, featured) =>
        setAllProducts((prev) =>
          prev.map((p) =>
            p.id === id && (!p.sellerId || p.sellerId === userId)
              ? { ...p, featured }
              : p,
          ),
        ),
      setIsFeatured: (id, isFeatured) =>
        setAllProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_featured: isFeatured } : p)),
        ),
      setStatus: (id, status) =>
        setAllProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status } : p)),
        ),
      adminRemoveProduct: (id) =>
        setAllProducts((prev) => prev.filter((p) => p.id !== id)),
    }),
    [products, userId],
  );

  return <SubmittedProductsContext.Provider value={value}>{children}</SubmittedProductsContext.Provider>;
};

export const useSubmittedProducts = () => {
  const ctx = useContext(SubmittedProductsContext);
  if (!ctx) throw new Error("useSubmittedProducts must be used within SubmittedProductsProvider");
  return ctx;
};

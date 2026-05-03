import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductRating {
  productId: number;
  userId: string;
  stars: number; // 1-5
  review?: string; // optional short written review
  ratedAt: string; // ISO
}

interface RatingsContextType {
  /** All ratings across users (for averaging). */
  allRatings: ProductRating[];
  /** Current user's rating for a product, or null. */
  getUserRating: (productId: number) => ProductRating | null;
  /** All ratings for a product (any user). */
  getRatingsForProduct: (productId: number) => ProductRating[];
  /** Average + count for a product. */
  getRatingSummary: (productId: number) => { average: number; count: number };
  /** Submit/update the current user's rating. Requires login. */
  rateProduct: (productId: number, stars: number, review?: string) => boolean;
  /**
   * Detailed result variant of rateProduct. Distinguishes a brand-new review
   * from an edit, and rejects exact duplicates (same stars + same review text)
   * as a basic moderation guard against accidental re-submissions.
   */
  rateProductDetailed: (
    productId: number,
    stars: number,
    review?: string,
  ) => "created" | "updated" | "duplicate" | "unauthorized" | "ineligible";
  /** Whether a user is logged in (gate UI). */
  isAuthenticated: boolean;
  /** Current user's own id (for "You" labelling), or null. */
  currentUserId: string | null;
  /** Resolve a display name for a given userId (from profiles cache). */
  getReviewerName: (userId: string) => string;
}

const STORAGE_KEY = "shop:ratings";
const ORDERS_STORAGE_KEY = "shop:orders";
const RatingsContext = createContext<RatingsContextType | undefined>(undefined);

/**
 * Verify — from the persisted orders store — that the given user has a
 * completed order containing the product. This is the source-of-truth gate
 * for submitting a rating/review, so no UI path can bypass it.
 */
const hasCompletedPurchase = (userId: string, productId: number): boolean => {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    return parsed.some((o: unknown) => {
      if (!o || typeof o !== "object") return false;
      const order = o as {
        userId?: string | null;
        status?: string;
        items?: Array<{ id?: number }>;
      };
      if (order.status !== "completed") return false;
      if (order.userId && order.userId !== userId) return false;
      return Array.isArray(order.items) && order.items.some((i) => i?.id === productId);
    });
  } catch {
    return false;
  }
};

export const RatingsProvider = ({ children }: { children: ReactNode }) => {
  const [allRatings, setAllRatings] = useState<ProductRating[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRatings));
    } catch {
      /* ignore quota */
    }
  }, [allRatings]);

  // Fetch display names for all reviewer user ids we don't yet have cached.
  useEffect(() => {
    const missing = Array.from(
      new Set(allRatings.map((r) => r.userId).filter((id) => !(id in profileNames))),
    );
    if (missing.length === 0) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", missing)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setProfileNames((prev) => {
          const next = { ...prev };
          for (const id of missing) next[id] = ""; // mark as resolved even if no profile row
          for (const row of data) {
            const name =
              (row.name && row.name.trim()) ||
              (row.email ? row.email.split("@")[0] : "") ||
              "";
            next[row.id as string] = name;
          }
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [allRatings, profileNames]);

  const getUserRating = (productId: number) =>
    (userId && allRatings.find((r) => r.productId === productId && r.userId === userId)) || null;

  const getRatingsForProduct = (productId: number) =>
    allRatings.filter((r) => r.productId === productId);

  const getRatingSummary = (productId: number) => {
    const list = getRatingsForProduct(productId);
    if (list.length === 0) return { average: 0, count: 0 };
    const sum = list.reduce((acc, r) => acc + r.stars, 0);
    return { average: sum / list.length, count: list.length };
  };

  const rateProductDetailed = (
    productId: number,
    stars: number,
    review?: string,
  ): "created" | "updated" | "duplicate" | "unauthorized" | "ineligible" => {
    if (!userId) return "unauthorized";
    if (!hasCompletedPurchase(userId, productId)) return "ineligible";
    const clamped = Math.max(1, Math.min(5, Math.round(stars)));
    const trimmed = typeof review === "string" ? review.trim().slice(0, 500) : undefined;

    const existing = allRatings.find(
      (r) => r.productId === productId && r.userId === userId,
    );

    // If the new submission is byte-for-byte identical to the existing one,
    // treat it as a duplicate and reject. Editing stars OR review text is a
    // legitimate update.
    if (existing) {
      const nextReview =
        trimmed !== undefined ? (trimmed.length > 0 ? trimmed : undefined) : existing.review;
      const sameStars = existing.stars === clamped;
      const sameReview = (existing.review ?? undefined) === (nextReview ?? undefined);
      if (sameStars && sameReview) return "duplicate";
    }

    const nextReview =
      trimmed !== undefined ? (trimmed.length > 0 ? trimmed : undefined) : existing?.review;

    setAllRatings((prev) => {
      const others = prev.filter(
        (r) => !(r.productId === productId && r.userId === userId),
      );
      return [
        ...others,
        {
          productId,
          userId,
          stars: clamped,
          review: nextReview,
          ratedAt: new Date().toISOString(),
        },
      ];
    });
    return existing ? "updated" : "created";
  };

  const rateProduct = (productId: number, stars: number, review?: string) => {
    const result = rateProductDetailed(productId, stars, review);
    return result === "created" || result === "updated";
  };

  const getReviewerName = (uid: string) => {
    const cached = profileNames[uid];
    if (cached && cached.length > 0) return cached;
    return "Anonymous";
  };

  const value = useMemo<RatingsContextType>(
    () => ({
      allRatings,
      getUserRating,
      getRatingsForProduct,
      getRatingSummary,
      rateProduct,
      rateProductDetailed,
      isAuthenticated: !!userId,
      currentUserId: userId,
      getReviewerName,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRatings, userId, profileNames],
  );

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>;
};

export const useRatings = () => {
  const ctx = useContext(RatingsContext);
  if (!ctx) throw new Error("useRatings must be used within RatingsProvider");
  return ctx;
};

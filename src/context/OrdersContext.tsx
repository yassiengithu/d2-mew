import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { ProductSource } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "completed";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "in_transit",
  "delivered",
];

export interface ShipmentInfo {
  easyshipShipmentId?: string | null;
  trackingNumber?: string | null;
  labelUrl?: string | null;
  courierId?: string | null;
  courierName?: string | null;
  cost?: number | null;
  currency?: string | null;
  createdAt?: string;
}

export type PaymentMethodId = "cod" | "gcash" | "card";

export type PaymentStatus = "unpaid" | "under_review" | "paid" | "failed";

export interface PaymentMethodInfo {
  id: PaymentMethodId;
  name: string;
  detail?: string;
  status: PaymentStatus;
  /**
   * Provider-issued reference for this payment attempt (e.g. Stripe Checkout
   * session id, Paddle transaction id, GCash request id). Assigned when the
   * payment URL is generated and used to correlate webhooks with the order
   * before the charge settles.
   */
  paymentReferenceId?: string;
  /** Provider transaction id, set after a successful charge. */
  transactionId?: string;
  /** Last failure reason, set after an unsuccessful attempt. */
  failureReason?: string;
  /**
   * Provider-hosted payment URL for this specific order (e.g. Stripe Checkout
   * session, GCash/Paddle pay link). Generated per-order by the payment
   * gateway — never a static, shared link.
   *
   * `undefined` means a URL hasn't been generated yet; the UI should request
   * one before sending the buyer to pay.
   */
  paymentUrl?: string;
  /**
   * ISO timestamp after which `paymentUrl` should be considered stale and
   * regenerated. Optional — providers that don't expire links can omit this.
   */
  paymentUrlExpiresAt?: string;
}

export interface OrderItem {
  id: number;
  name: string;
  img: string;
  price: number;
  qty: number;
  source?: ProductSource;
  sellerName?: string;
}

export interface PlacedOrder {
  id: string;
  userId?: string | null;
  placedAt: string; // ISO string
  status: OrderStatus;
  trackingNumber: string;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  name: string;
  phone: string;
  address: string;
  courier: {
    id: string;
    name: string;
    fee: number;
    etaDays: string;
    etaMaxDays: number;
  };
  payment?: PaymentMethodInfo;
  shipment?: ShipmentInfo;
}

interface OrdersContextType {
  orders: PlacedOrder[];
  addOrder: (order: PlacedOrder) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => void;
  updateTrackingNumber: (orderId: string, trackingNumber: string) => void;
  attachShipment: (orderId: string, shipment: ShipmentInfo) => void;
  /**
   * Attach (or replace) the provider-generated payment URL for an order.
   * Called after `paymentGateway.createPaymentUrl()` resolves.
   */
  setOrderPaymentUrl: (
    orderId: string,
    paymentUrl: string,
    expiresAt?: string,
    referenceId?: string,
  ) => void;
  /**
   * Settle an order as paid. Intended to be called from the payment gateway
   * success callback (or a webhook handler in production).
   */
  markOrderPaid: (orderId: string, transactionId?: string) => void;
  /**
   * Mark an order's payment as failed. Order status itself is left untouched
   * so the buyer can retry without losing context.
   */
  markOrderFailed: (orderId: string, reason?: string) => void;
  clearOrders: () => void;
}

const STORAGE_KEY = "shop:orders";
const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

const normalizeOrderStatus = (status: unknown): OrderStatus => {
  if (status === "completed") return "completed";
  if (status === "delivered") return "delivered";
  if (status === "in_transit") return "in_transit";
  if (status === "shipped") return "shipped";
  if (status === "processing") return "processing";
  if (status === "paid") return "paid";
  if (status === "pending") return "pending";
  if (status === "preparing") return "pending";
  return "pending";
};

export const OrdersProvider = ({ children }: { children: ReactNode }) => {
  const [allOrders, setAllOrders] = useState<PlacedOrder[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((order) => ({ ...order, status: normalizeOrderStatus(order?.status) }))
        : [];
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allOrders));
      // Notify same-tab listeners (e.g., the analytics dashboard) that orders changed.
      window.dispatchEvent(new CustomEvent("orders:updated"));
    } catch {
      /* ignore quota errors */
    }
  }, [allOrders]);

  // Only show orders that belong to the currently logged-in user.
  // Legacy orders (no userId) remain visible to signed-in users so existing
  // demo data isn't lost; new orders always carry a userId.
  const orders = useMemo(
    () =>
      userId
        ? allOrders.filter((o) => !o.userId || o.userId === userId)
        : [],
    [allOrders, userId],
  );

  const notify = (
    uid: string | null | undefined,
    title: string,
    body: string,
    link: string,
    type: string = "order",
  ) => {
    if (!uid) return;
    // Fire-and-forget; RLS ensures only the authenticated user can insert their own notification.
    supabase
      .from("notifications")
      .insert({ user_id: uid, type, title, body, link })
      .then(({ error }) => {
        if (error) console.warn("notification insert failed", error.message);
      });
  };

  const addOrder = (order: PlacedOrder) => {
    // New orders always start as "pending" until payment is confirmed.
    // We normalize here so any caller — including legacy code paths — is guaranteed
    // a consistent initial status.
    const ownerId = order.userId ?? userId;
    const withUser: PlacedOrder = {
      ...order,
      userId: ownerId,
      status: "pending",
    };
    setAllOrders((prev) => [withUser, ...prev]);
    notify(
      ownerId,
      "Order placed",
      `Your order ${order.id} for ₱${order.total.toLocaleString("en-US")} has been received.`,
      `/orders/${encodeURIComponent(order.id)}`,
    );
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setAllOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  };

  const updatePaymentStatus = (orderId: string, status: PaymentStatus) => {
    let notifyTarget: { uid: string | null | undefined; total: number } | null = null as { uid: string | null | undefined; total: number } | null;
    setAllOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId || !o.payment) return o;
        const wasPaid = o.payment.status === "paid";
        const next: PlacedOrder = { ...o, payment: { ...o.payment, status } };
        // Auto-advance order status when payment is confirmed paid (only if still in early stages)
        if (status === "paid" && (next.status === "pending" || next.status === "paid")) {
          next.status = "paid";
        }
        if (status === "paid" && !wasPaid) {
          notifyTarget = { uid: o.userId ?? userId, total: o.total };
        }
        return next;
      }),
    );
    if (notifyTarget) {
      notify(
        notifyTarget.uid,
        "Payment confirmed",
        `Payment of ₱${notifyTarget.total.toLocaleString("en-US")} for order ${orderId} was confirmed.`,
        `/orders/${encodeURIComponent(orderId)}`,
        "payment",
      );
    }
  };

  const updateTrackingNumber = (orderId: string, trackingNumber: string) => {
    const normalized = trackingNumber.trim().toUpperCase();
    setAllOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, trackingNumber: normalized } : o)),
    );
  };

  const setOrderPaymentUrl = (
    orderId: string,
    paymentUrl: string,
    expiresAt?: string,
    referenceId?: string,
  ) => {
    setAllOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId || !o.payment) return o;
        return {
          ...o,
          payment: {
            ...o.payment,
            paymentUrl,
            paymentUrlExpiresAt: expiresAt ?? o.payment.paymentUrlExpiresAt,
            paymentReferenceId: referenceId ?? o.payment.paymentReferenceId,
          },
        };
      }),
    );
  };

  /**
   * Settle an order as paid. Atomically:
   *   - flips payment status to "paid"
   *   - bumps order status to "paid" (only if still in pre-paid stages)
   *   - records the provider transaction id on the payment for receipts
   */
  const markOrderPaid = (orderId: string, transactionId?: string) => {
    let notifyTarget = null as { uid: string | null | undefined; total: number } | null;
    setAllOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const wasPaid = o.payment?.status === "paid";
        const next: PlacedOrder = {
          ...o,
          payment: o.payment
            ? { ...o.payment, status: "paid", transactionId: transactionId ?? o.payment.transactionId }
            : o.payment,
        };
        if (next.status === "pending") {
          next.status = "paid";
        }
        if (!wasPaid && o.payment) {
          notifyTarget = { uid: o.userId ?? userId, total: o.total };
        }
        return next;
      }),
    );
    if (notifyTarget) {
      notify(
        notifyTarget.uid,
        "Payment confirmed",
        `Payment of ₱${notifyTarget.total.toLocaleString("en-US")} for order ${orderId} was confirmed.`,
        `/orders/${encodeURIComponent(orderId)}`,
      );
    }
  };

  /**
   * Record a failed payment attempt. Order status itself stays where it is so
   * the buyer can retry without re-creating the order.
   */
  const markOrderFailed = (orderId: string, reason?: string) => {
    setAllOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId || !o.payment) return o;
        return {
          ...o,
          payment: {
            ...o.payment,
            status: "failed",
            failureReason: reason ?? o.payment.failureReason,
          },
        };
      }),
    );
  };

  const attachShipment = (orderId: string, shipment: ShipmentInfo) => {
    let notifyTarget: { uid: string | null | undefined } | null = null;
    setAllOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const merged: ShipmentInfo = {
          ...(o.shipment ?? {}),
          ...shipment,
          createdAt: o.shipment?.createdAt ?? new Date().toISOString(),
        };
        const next: PlacedOrder = {
          ...o,
          shipment: merged,
          trackingNumber: merged.trackingNumber ?? o.trackingNumber,
        };
        // Auto-advance to "shipped" once we have a tracking number, unless already further.
        if (
          merged.trackingNumber &&
          (next.status === "pending" || next.status === "paid" || next.status === "processing")
        ) {
          next.status = "shipped";
          notifyTarget = { uid: o.userId ?? userId };
        }
        return next;
      }),
    );
    if (notifyTarget) {
      notify(
        notifyTarget.uid,
        "Order shipped",
        `Order ${orderId} has been handed to the courier${
          shipment.trackingNumber ? ` (tracking ${shipment.trackingNumber})` : ""
        }.`,
        `/orders/${encodeURIComponent(orderId)}`,
        "shipping",
      );
    }
  };

  const clearOrders = () => {
    // Only clear orders for the current user (or all legacy ones if signed out).
    setAllOrders((prev) => prev.filter((o) => o.userId && o.userId !== userId));
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        addOrder,
        updateOrderStatus,
        updatePaymentStatus,
        updateTrackingNumber,
        attachShipment,
        setOrderPaymentUrl,
        markOrderPaid,
        markOrderFailed,
        clearOrders,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
};

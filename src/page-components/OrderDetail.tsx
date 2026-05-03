import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Truck, CheckCircle, Clock, MapPin, Phone, User, Package, Receipt, Copy, BadgeCheck, AlertCircle, Loader2, Wallet, Smartphone, CreditCard, ShieldCheck, RotateCcw, ExternalLink, Navigation, Route, MousePointerClick, ArrowLeftRight, Info, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import SourceBadge from "@/components/SourceBadge";
import { useOrders, type OrderStatus, type PaymentStatus } from "@/context/OrdersContext";
import { useRatings } from "@/context/RatingsContext";
import StarRating from "@/components/StarRating";
import { startPayment, createPaymentUrl, isPaymentUrlStale } from "@/lib/paymentGateway";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VISUALS } from "@/lib/paymentStatus";
import { ORDER_STATUS_FLOW, getOrderStatusVisual, getOrderStatusIndex } from "@/lib/orderStatus";
import PaymentStatusBadge from "@/components/PaymentStatusBadge";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { useAdminMode } from "@/hooks/useAdminMode";
import { Switch } from "@/components/ui/switch";
import { PLATFORM_COMMISSION_LABEL, calculatePlatformFee } from "@/lib/commission";

// Status visuals are centralized in src/lib/orderStatus.ts

const REVIEW_MAX = 500;

const ReviewEditor = ({
  productId: _productId,
  productName,
  stars: _stars,
  initialReview,
  onSave,
}: {
  productId: number;
  productName: string;
  stars: number;
  initialReview: string;
  onSave: (text: string) => void;
}) => {
  const [text, setText] = useState(initialReview);
  const [editing, setEditing] = useState(initialReview.length === 0);
  const dirty = text.trim() !== initialReview.trim();

  if (!editing) {
    return (
      <div className="mt-2 rounded-2xl border border-border bg-card shadow-card px-3 py-2.5 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold text-foreground">Your review</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[10px] font-semibold text-primary hover:underline shrink-0"
          >
            Edit
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-snug whitespace-pre-wrap break-words">
          {initialReview}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-2xl border border-border bg-card shadow-card px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground">
          {initialReview ? "Edit your review" : "Write a review (optional)"}
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {text.length}/{REVIEW_MAX}
        </p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, REVIEW_MAX))}
        placeholder={`Share your experience with ${productName}…`}
        rows={3}
        className="text-xs resize-none rounded-xl bg-background"
      />
      <div className="flex items-center justify-end gap-2">
        {initialReview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-[11px]"
            onClick={() => {
              setText(initialReview);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-xl text-[11px] font-bold"
          disabled={!dirty}
          onClick={() => {
            onSave(text);
            setEditing(false);
          }}
        >
          {initialReview ? "Save changes" : "Post review"}
        </Button>
      </div>
    </div>
  );
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const getCourierTrackingUrl = (courierId: string, trackingNumber: string) => {
  const tracking = encodeURIComponent(trackingNumber.trim());
  if (!tracking) return null;

  switch (courierId) {
    case "jnt":
      return `https://www.jtexpress.ph/index/query/gzquery.html?billcode=${tracking}`;
    case "ninja":
      return `https://www.ninjavan.co/en-ph/tracking?id=${tracking}`;
    case "flash":
      return `https://www.flashexpress.ph/tracking/?se=${tracking}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(`${courierId} ${trackingNumber} tracking`)}`;
  }
};

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    orders,
    updateOrderStatus,
    updatePaymentStatus,
    updateTrackingNumber,
    setOrderPaymentUrl,
    markOrderPaid,
    markOrderFailed,
  } = useOrders();
  const { getUserRating, rateProduct, rateProductDetailed, isAuthenticated } = useRatings();
  const order = useMemo(() => orders.find((o) => o.id === id), [orders, id]);
  const [adminMode, setAdminMode] = useAdminMode();
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [payingNow, setPayingNow] = useState(false);
  const [returnBanner, setReturnBanner] = useState<"success" | "cancelled" | null>(null);

  // Handle return from PayMongo Checkout. Show a confirmation banner + toast,
  // optimistically flip payment status, and strip the query param.
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment !== "success" && payment !== "cancelled") return;
    if (!order) return;

    if (payment === "success") {
      setReturnBanner("success");
      if (order.payment?.status !== "paid") {
        // Optimistic — webhook will reconcile authoritatively
        updatePaymentStatus(order.id, "under_review");
      }
      toast.success("Thanks! We received your payment", {
        id: `payment-return-${order.id}`,
        description: "We're confirming it now — you'll see the update here shortly.",
      });
    } else {
      setReturnBanner("cancelled");
      toast.info("Payment cancelled", {
        id: `payment-return-${order.id}`,
        description: "Your order is still reserved. You can try paying again anytime.",
      });
    }

    // Strip the query param so reloading the page doesn't re-fire.
    const next = new URLSearchParams(searchParams);
    next.delete("payment");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);


  useEffect(() => {
    setTrackingInput(order?.trackingNumber ?? "");
    setTrackingError("");
  }, [order?.trackingNumber]);

  // Announce successful payments. Fires once per transition to "paid" so the
  // confirmation is surfaced even if the user has scrolled away from the
  // payment status card.
  const paymentStatusValue = order?.payment?.status;
  useEffect(() => {
    if (paymentStatusValue !== "paid") return;
    toast.success("Payment confirmed", {
      id: `payment-confirmed-${order?.id}`,
      description: "Your order is now being processed.",
    });
  }, [paymentStatusValue, order?.id]);

  const handleSetPaymentStatus = (next: PaymentStatus) => {
    if (!order) return;
    updatePaymentStatus(order.id, next);
    toast.success(`Payment marked as ${PAYMENT_STATUS_LABELS[next]}`);
  };

  const handleSetOrderStatus = (next: OrderStatus) => {
    if (!order) return;
    updateOrderStatus(order.id, next);
    toast.success(`Order status updated to ${getOrderStatusVisual(next).label}`);
  };

  const handleSaveTrackingNumber = () => {
    if (!order) return;
    const normalized = trackingInput.trim().toUpperCase();
    if (!/^[A-Z0-9-]{6,32}$/.test(normalized)) {
      setTrackingError("Use 6–32 letters, numbers, or hyphens only.");
      return;
    }
    updateTrackingNumber(order.id, normalized);
    setTrackingInput(normalized);
    setTrackingError("");
    toast.success("Tracking number updated");
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="Order not found" backTo="/orders" />
        <div className="flex flex-col items-center justify-center gap-4 pt-24 px-8 text-center">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
            <Package className="h-9 w-9 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">We couldn't find that order.</p>
          <Button asChild className="rounded-xl h-11 px-8 text-sm font-bold mt-2">
            <Link to="/orders">Back to My Orders</Link>
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const statusVisual = getOrderStatusVisual(order.status);
  const StatusIcon = statusVisual.icon;
  const platformFee = calculatePlatformFee(order.subtotal);
  const trackingUrl = order.trackingNumber
    ? getCourierTrackingUrl(order.courier.id, order.trackingNumber)
    : null;

  const paymentStatus = order.payment?.status ?? "unpaid";
  const paymentMethodId = order.payment?.id;
  const needsPayment =
    (paymentStatus === "unpaid" || paymentStatus === "failed") && paymentMethodId !== "cod";

  const handlePayNow = async () => {
    if (!order || payingNow) return;
    setPayingNow(true);
    const pendingToast = toast.loading("Starting payment…", {
      description: "Opening secure checkout. Don't close this tab.",
    });
    try {
      // Step 1 — make sure we have a fresh, per-order payment URL.
      let paymentUrl = order.payment?.paymentUrl;
      if (isPaymentUrlStale(paymentUrl, order.payment?.paymentUrlExpiresAt)) {
        try {
          const generated = await createPaymentUrl(order);
          setOrderPaymentUrl(
            order.id,
            generated.url,
            generated.expiresAt,
            generated.reference,
          );
          paymentUrl = generated.url;
        } catch (err) {
          // Couldn't even reach the gateway to create a checkout session.
          // Don't mark the order as failed — this is a transient client/network
          // problem, not a declined charge. Surface a retry instead.
          console.error("[payment] createPaymentUrl failed", err);
          toast.error("Couldn't start payment", {
            id: pendingToast,
            description:
              "We couldn't reach the payment processor. Check your connection and try again.",
            action: { label: "Retry", onClick: () => handlePayNow() },
          });
          return;
        }
      }

      // Placeholder gateway — see src/lib/paymentGateway.ts for the integration TODOs.
      await startPayment(order, {
        onSuccess: (success) => {
          markOrderPaid(order.id, success.transactionId);
          toast.success("Payment confirmed", {
            id: pendingToast,
            description: `Order is now being processed · Ref ${success.transactionId}`,
          });
        },
        onFailure: (failure) => {
          markOrderFailed(order.id, failure.reason);
          toast.error("Payment didn't go through", {
            id: pendingToast,
            description: failure.message,
            action: { label: "Try again", onClick: () => handlePayNow() },
          });
        },
      });
    } catch (err) {
      // Unexpected throw from the gateway (e.g. network blip, provider SDK
      // bug). Treat as a generic failure on the order so the user sees a
      // recoverable state rather than the loading toast hanging forever.
      console.error("[payment] unexpected error during startPayment", err);
      markOrderFailed(order.id, "unknown");
      toast.error("Something went wrong", {
        id: pendingToast,
        description:
          "An unexpected error occurred while processing your payment. Please try again.",
        action: { label: "Try again", onClick: () => handlePayNow() },
      });
    } finally {
      setPayingNow(false);
    }
  };
  return (
    <div className={`min-h-screen bg-background max-w-md mx-auto relative ${needsPayment ? "pb-44" : "pb-20"}`}>
      <PageHeader
        title="Order Details"
        subtitle={order.id}
        backTo="/orders"
        trailing={<OrderStatusBadge status={order.status} size="sm" />}
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Return-from-PayMongo banner */}
        {returnBanner === "success" && (
          <div
            role="status"
            className="rounded-2xl border-2 border-success/40 bg-success/10 p-4 flex items-start gap-3 animate-fade-in"
          >
            <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-success leading-tight">
                Payment received — thank you!
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                We're confirming it with the payment processor. Your order will move to{" "}
                <span className="font-bold text-foreground">Paid</span> as soon as it clears
                (usually a few seconds).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReturnBanner(null)}
              aria-label="Dismiss"
              className="p-1 -m-1 rounded-md text-muted-foreground hover:text-foreground shrink-0"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
        {returnBanner === "cancelled" && (
          <div
            role="status"
            className="rounded-2xl border-2 border-warning/40 bg-warning/10 p-4 flex items-start gap-3 animate-fade-in"
          >
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-warning-foreground leading-tight">
                Payment cancelled
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                No worries — your order is still reserved. Tap{" "}
                <span className="font-bold text-foreground">Pay Now</span> below whenever you're
                ready.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReturnBanner(null)}
              aria-label="Dismiss"
              className="p-1 -m-1 rounded-md text-muted-foreground hover:text-foreground shrink-0"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Status hero + progress */}
        <Card className={`p-4 space-y-4 border ${statusVisual.surface}`}>
          <div className="flex items-start gap-3">
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center bg-card shadow-sm border ${statusVisual.surface} shrink-0`}
            >
              <StatusIcon
                className={`h-6 w-6 ${statusVisual.text} ${statusVisual.animate ? "animate-spin" : ""} ${statusVisual.pulse ? "animate-pulse" : ""}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-base font-bold leading-tight ${statusVisual.text}`}>
                  {statusVisual.headline}
                </p>
                <OrderStatusBadge status={order.status} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                {statusVisual.tagline}
              </p>
            </div>
          </div>

          {/* Total + items at-a-glance */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-card border border-border px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold leading-none">
                {paymentStatus === "paid" ? "Total Paid" : "Order Total"}
              </p>
              <p className={`text-lg font-extrabold tabular-nums leading-tight mt-1 ${paymentStatus === "paid" ? "text-success" : "text-primary"}`}>
                ₱{order.total.toLocaleString("en-US")}
              </p>
            </div>
            <div className="rounded-xl bg-card border border-border px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold leading-none">
                Items
              </p>
              <p className="text-lg font-extrabold text-foreground tabular-nums leading-tight mt-1">
                {order.itemCount}
              </p>
            </div>
          </div>

          {(() => {
            const currentIdx = getOrderStatusIndex(order.status);
            return (
              <div className="flex items-start justify-between relative pt-1">
                {ORDER_STATUS_FLOW.map((stepKey, idx) => {
                  const stepVisual = getOrderStatusVisual(stepKey);
                  const reached = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  const Icon = stepVisual.icon;
                  return (
                    <div
                      key={stepKey}
                      className="flex-1 flex flex-col items-center relative z-10 min-w-0"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                          reached
                            ? `${stepVisual.bar} border-transparent text-primary-foreground`
                            : "bg-card border-border text-muted-foreground"
                        } ${isCurrent ? `ring-4 ${stepVisual.ring}` : ""}`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 ${isCurrent && stepVisual.animate ? "animate-spin" : ""}`}
                        />
                      </div>
                      <p
                        className={`mt-1.5 text-[10px] font-semibold text-center leading-tight ${
                          reached ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {stepVisual.label}
                      </p>
                      {idx < ORDER_STATUS_FLOW.length - 1 && (
                        <div
                          className={`absolute top-[15px] left-1/2 w-full h-0.5 -z-0 transition-colors ${
                            idx < currentIdx ? statusVisual.bar : "bg-border"
                          }`}
                          aria-hidden
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Inline primary action when payment is needed and sticky bar is shown — quick reachable CTA on the hero */}
          {needsPayment && (
            <Button
              type="button"
              size="lg"
              onClick={handlePayNow}
              disabled={payingNow}
              className="w-full h-12 rounded-xl text-sm font-extrabold gap-2 shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-transform"
            >
              {payingNow ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  {paymentStatus === "failed" ? "Retry Payment" : `Pay ₱${order.total.toLocaleString("en-US")}`}
                </>
              )}
            </Button>
          )}
        </Card>

        {/* Tracking & meta */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Order Info</h2>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground shrink-0">Order ID</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-mono font-semibold text-foreground truncate">
                  {order.id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(order.id).then(
                      () => toast.success("Order ID copied"),
                      () => toast.error("Couldn't copy"),
                    );
                  }}
                  className="p-1 -m-0.5 rounded-md active:bg-secondary text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Copy order ID"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {order.trackingNumber && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground shrink-0">Tracking #</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-mono font-semibold text-foreground truncate">
                    {order.trackingNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(order.trackingNumber).then(
                        () => toast.success("Tracking number copied"),
                        () => toast.error("Couldn't copy"),
                      );
                    }}
                    className="p-1 -m-0.5 rounded-md active:bg-secondary text-muted-foreground hover:text-foreground shrink-0"
                    aria-label="Copy tracking number"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground shrink-0">Placed on</span>
              <span className="text-xs font-semibold text-foreground text-right">
                {formatDate(order.placedAt)}
              </span>
            </div>
          </div>
        </Card>

        {/* Products */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Products ({order.itemCount} {order.itemCount === 1 ? "item" : "items"})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {order.items.map((item, i) => {
              const userRating = getUserRating(item.id);
              const canRate = order.status === "completed" && isAuthenticated;
              return (
              <div key={item.id} className={`${i === 0 ? "pb-3" : "py-3"} ${i === order.items.length - 1 ? "pb-0" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-xl shrink-0">
                    {item.img}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        ₱{item.price.toLocaleString("en-US")} × {item.qty}
                      </p>
                      {item.source && <SourceBadge source={item.source} />}
                    </div>
                    {item.sellerName && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.sellerName}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground shrink-0">
                    ₱{(item.price * item.qty).toLocaleString("en-US")}
                  </p>
                </div>
                {canRate && (
                  <div className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-foreground">
                        {userRating ? "Your rating" : "Rate this product"}
                      </p>
                      {userRating && (
                        <p className="text-[10px] text-muted-foreground">Tap a star to update</p>
                      )}
                    </div>
                    <StarRating
                      size="sm"
                      value={userRating?.stars ?? 0}
                      onChange={(stars) => {
                        const ok = rateProduct(item.id, stars);
                        if (ok) {
                          toast.success(
                            userRating ? "Rating updated" : "Thanks for your rating!",
                            { description: `${stars} of 5 stars for ${item.name}` },
                          );
                        } else {
                          toast.error("Can't submit rating", {
                            description: "Only verified buyers of completed orders can rate.",
                          });
                        }
                      }}
                    />
                  </div>
                )}
                {canRate && userRating && (
                  <ReviewEditor
                    key={`${item.id}-${userRating.ratedAt}`}
                    productId={item.id}
                    productName={item.name}
                    stars={userRating.stars}
                    initialReview={userRating.review ?? ""}
                    onSave={(text) => {
                      const result = rateProductDetailed(item.id, userRating.stars, text);
                      if (result === "created" || result === "updated") {
                        toast.success(
                          text.trim().length > 0 ? "Review saved" : "Review cleared",
                          { description: item.name },
                        );
                      } else if (result === "duplicate") {
                        toast.error("Already submitted", {
                          description: "You've already left this exact review for this product.",
                        });
                      } else {
                        toast.error("Can't save review", {
                          description: "Only verified buyers of completed orders can review.",
                        });
                      }
                    }}
                  />
                )}
                {order.status === "completed" && !isAuthenticated && (
                  <p className="mt-2 text-[10px] text-muted-foreground">Sign in to rate this product.</p>
                )}
              </div>
              );
            })}
          </div>
        </Card>

        {/* Delivery info */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Route className="h-4 w-4 text-primary shrink-0" />
              <h2 className="text-sm font-bold text-foreground truncate">Courier & Tracking</h2>
            </div>
            <OrderStatusBadge status={order.status} size="sm" />
          </div>

          <div className="rounded-lg bg-secondary/60 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-semibold text-foreground">{order.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground">{order.phone}</span>
            </div>
            <div className="flex items-start gap-2 pt-1 border-t border-border">
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground leading-relaxed">{order.address}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Courier</p>
              <p className="text-sm font-bold text-foreground truncate">{order.courier.name}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 px-3 py-2.5 text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">ETA</p>
              <p className="text-sm font-bold text-foreground truncate">{order.courier.etaDays}</p>
            </div>
          </div>

          {order.trackingNumber && (
            <div className="rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-primary font-bold">Tracking Number</p>
                    <p className="text-sm font-mono font-extrabold text-foreground tabular-nums truncate">
                      {order.trackingNumber}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(order.trackingNumber).then(
                      () => toast.success("Tracking number copied"),
                      () => toast.error("Couldn't copy"),
                    );
                  }}
                  className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground active:scale-95 transition-transform"
                  aria-label="Copy tracking number"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {trackingUrl && (
                <Button asChild size="sm" className="w-full h-9 rounded-lg text-xs font-bold gap-1.5">
                  <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Track Shipment
                  </a>
                </Button>
              )}
            </div>
          )}

          {order.shipment && (order.shipment.trackingNumber || order.shipment.labelUrl) && (
            <div className="rounded-xl bg-success/10 border border-success/30 px-3 py-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-success shrink-0" />
                <p className="text-xs font-bold text-success">
                  Shipment created with {order.shipment.courierName ?? "courier"}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {order.shipment.trackingNumber && (
                  <Button asChild size="sm" variant="outline" className="h-9 rounded-lg text-xs font-bold gap-1.5 flex-1">
                    <Link to={`/track/${encodeURIComponent(order.shipment.trackingNumber)}`}>
                      <Navigation className="h-3.5 w-3.5" />
                      Live tracking
                    </Link>
                  </Button>
                )}
                {order.shipment.labelUrl && (
                  <Button asChild size="sm" variant="outline" className="h-9 rounded-lg text-xs font-bold gap-1.5 flex-1">
                    <a href={order.shipment.labelUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Download label
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Payment status — prominent card */}
        {(() => {
          const status = order.payment?.status ?? "unpaid";
          const methodId = order.payment?.id;
          const methodName = order.payment?.name ?? "Cash on Delivery";
          const PaymentIcon =
            methodId === "gcash" ? Smartphone : methodId === "card" ? CreditCard : Wallet;
          const v = PAYMENT_STATUS_VISUALS[status];
          const Icon = v.icon;
          const helper =
            status === "paid"
              ? `Paid via ${methodName}. Your order is being processed.`
              : status === "under_review"
                ? "We're verifying your payment. This usually takes a few minutes — you'll be notified once it's confirmed."
                : status === "failed"
                  ? `Your ${methodName} payment didn't go through. Try again or use a different method.`
                  : methodId === "cod"
                    ? `Pay ₱${order.total.toLocaleString("en-US")} in cash when your order arrives — no action needed now.`
                    : `Complete payment via ${methodName} to start processing your order.`;
          return (
            <Card className={`p-4 space-y-3 border-2 ${v.ring}`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${v.dot} ${v.spin ? "animate-pulse" : ""}`} />
                  Payment Status
                </h2>
                <PaymentStatusBadge status={status} size="md" />
              </div>

              {status === "unpaid" && methodId !== "cod" && (
                <div className="rounded-2xl bg-warning/10 border-2 border-warning/30 p-4 text-center space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-full bg-warning/20 flex items-center justify-center relative">
                    <Clock className="h-7 w-7 text-warning" />
                    <span className="absolute inset-0 rounded-full border-2 border-warning/40 animate-ping" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-extrabold text-foreground">Waiting for payment</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Your order is reserved. Tap <span className="font-bold text-foreground">Pay Now</span> below to complete your purchase.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl bg-card border border-border px-2.5 py-2 text-left">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                        Order ID
                      </p>
                      <p className="text-[11px] font-mono font-bold text-foreground truncate">
                        {order.id}
                      </p>
                    </div>
                    <div className="rounded-xl bg-card border border-border px-2.5 py-2 text-left">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                        Total Amount
                      </p>
                      <p className="text-sm font-extrabold text-primary tabular-nums">
                        ₱{order.total.toLocaleString("en-US")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {status === "failed" && (
                <div className="rounded-2xl bg-destructive/10 border-2 border-destructive/30 p-4 text-center space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-full bg-destructive/20 flex items-center justify-center">
                    <XCircle className="h-7 w-7 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-extrabold text-foreground">Payment failed</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      We couldn't confirm your payment. Please try again or contact support.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl bg-card border border-border px-2.5 py-2 text-left">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                        Order ID
                      </p>
                      <p className="text-[11px] font-mono font-bold text-foreground truncate">
                        {order.id}
                      </p>
                    </div>
                    <div className="rounded-xl bg-card border border-border px-2.5 py-2 text-left">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                        Total Amount
                      </p>
                      <p className="text-sm font-extrabold text-primary tabular-nums">
                        ₱{order.total.toLocaleString("en-US")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {status === "under_review" && (
                <div className="rounded-2xl bg-info/10 border-2 border-info/30 p-4 text-center space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-full bg-info/20 flex items-center justify-center relative">
                    <Loader2 className="h-7 w-7 text-info animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-extrabold text-foreground">Verifying your payment</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Usually takes a few minutes. We'll notify you the moment it's confirmed.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl bg-card border border-border px-2.5 py-2 text-left">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                        Order ID
                      </p>
                      <p className="text-[11px] font-mono font-bold text-foreground truncate">
                        {order.id}
                      </p>
                    </div>
                    <div className="rounded-xl bg-card border border-border px-2.5 py-2 text-left">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                        Amount Submitted
                      </p>
                      <p className="text-sm font-extrabold text-primary tabular-nums">
                        ₱{order.total.toLocaleString("en-US")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {status === "paid" && (
                <div className="rounded-2xl bg-success/10 border-2 border-success/30 p-4 text-center space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-7 w-7 text-success" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-extrabold text-foreground">Payment confirmed</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Thanks! Your payment has been verified and your order is being processed.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl bg-card border border-border px-2.5 py-2 text-left">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                        Order ID
                      </p>
                      <p className="text-[11px] font-mono font-bold text-foreground truncate">
                        {order.id}
                      </p>
                    </div>
                    <div className="rounded-xl bg-card border border-border px-2.5 py-2 text-left">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                        Total Paid
                      </p>
                      <p className="text-sm font-extrabold text-success tabular-nums">
                        ₱{order.total.toLocaleString("en-US")}
                      </p>
                    </div>
                  </div>
                  {(order.payment?.transactionId || order.payment?.paymentReferenceId) && (
                    <div className="rounded-xl bg-card border border-border px-2.5 py-2 text-left">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                        Reference
                      </p>
                      <p className="text-[11px] font-mono font-bold text-foreground truncate">
                        {order.payment?.transactionId ?? order.payment?.paymentReferenceId}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div
                className={`rounded-xl px-3 py-2.5 ${v.surface} flex items-start gap-2`}
                role="status"
                aria-live="polite"
              >
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${v.text} ${v.spin ? "animate-spin" : ""}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className={`text-[10px] uppercase tracking-wide font-bold ${v.text}`}>
                    {PAYMENT_STATUS_LABELS[status]}
                  </p>
                  <p className={`text-xs leading-relaxed font-medium ${v.text}`}>{helper}</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <PaymentIcon className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Method</p>
                    <p className="text-xs font-bold text-foreground truncate">{methodName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    {status === "paid" ? "Total Paid" : "Total Due"}
                  </p>
                  <p className="text-base font-extrabold text-primary tabular-nums">
                    ₱{order.total.toLocaleString("en-US")}
                  </p>
                </div>
              </div>

              {(status === "unpaid" || status === "failed") && methodId !== "cod" && (
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="rounded-xl bg-secondary/60 px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                        Order ID
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground truncate">
                        {order.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                        Total Amount
                      </span>
                      <span className="text-sm font-extrabold text-primary tabular-nums">
                        ₱{order.total.toLocaleString("en-US")}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card px-3 py-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                      <p className="text-[11px] uppercase tracking-wide font-bold text-foreground">
                        Payment Instructions
                      </p>
                    </div>
                    <ol className="space-y-2">
                      {[
                        { icon: MousePointerClick, text: 'Click "Pay Now" below.' },
                        { icon: Smartphone, text: "Complete payment using GCash or supported methods." },
                        { icon: ArrowLeftRight, text: "Return to the app after payment." },
                      ].map((step, idx) => {
                        const StepIcon = step.icon;
                        return (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="mt-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                              <StepIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-xs text-foreground leading-relaxed">{step.text}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 px-2.5 py-2">
                      <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                      <p className="text-[11px] font-semibold text-foreground leading-snug">
                        Use the exact amount shown to avoid issues.
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center leading-snug">
                    Use the <span className="font-bold text-foreground">Pay Now</span> button at the bottom of the screen to continue.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => handleSetPaymentStatus("under_review")}
                    className="w-full h-12 rounded-2xl text-sm font-bold gap-2 border-2 border-info/40 text-info hover:bg-info/10 active:scale-[0.98] transition-transform"
                  >
                    <Loader2 className="h-4 w-4" />
                    I've sent the payment
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center leading-snug">
                    Tap once you've completed the transfer. We'll verify it within a few minutes.
                  </p>

                </div>
              )}

              {paymentStatus === "under_review" && (
                <div className="border-t border-border pt-3">
                  <div className="flex items-start gap-2 rounded-xl bg-info/10 border border-info/20 px-3 py-2.5">
                    <Loader2 className="h-4 w-4 text-info shrink-0 mt-0.5 animate-spin" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground leading-tight">
                        Verifying your payment
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        Usually takes a few minutes — we'll notify you when it's confirmed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })()}

        {!adminMode && (
          <button
            type="button"
            onClick={() => setAdminMode(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-card/60 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-[0.99] transition-all"
            aria-label="Enable admin order controls"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Enable admin controls
          </button>
        )}

        {adminMode && (
        <Card className="p-4 space-y-3 border-2 border-dashed border-muted">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground">Order Controls</h2>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Manage payment and delivery updates.
                </p>
              </div>
            </div>
            <Switch
              checked={adminMode}
              onCheckedChange={setAdminMode}
              aria-label="Toggle admin mode"
            />
          </div>

          {adminMode && (
            <div className="space-y-2 pt-1">
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  Tracking number
                </p>
                <div className="flex gap-2">
                  <Input
                    value={trackingInput}
                    onChange={(e) => {
                      setTrackingInput(e.target.value.toUpperCase());
                      if (trackingError) setTrackingError("");
                    }}
                    maxLength={32}
                    placeholder="JNT123456789PH"
                    className="h-10 text-xs font-mono uppercase"
                    aria-invalid={!!trackingError}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveTrackingNumber}
                    className="h-10 rounded-lg px-3 text-[11px] font-bold shrink-0"
                  >
                    Save
                  </Button>
                </div>
                {trackingError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" /> {trackingError}
                  </p>
                )}
              </div>

              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Update order status
              </p>
              <div className="grid grid-cols-4 gap-2">
                {ORDER_STATUS_FLOW.map((next) => {
                  const option = getOrderStatusVisual(next);
                  const OptionIcon = option.icon;
                  const isActive = order.status === next;
                  return (
                    <Button
                      key={next}
                      type="button"
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      onClick={() => handleSetOrderStatus(next)}
                      className="rounded-lg h-10 px-1 text-[10px] font-bold flex-col gap-0.5"
                    >
                      <OptionIcon
                        className={`h-3.5 w-3.5 ${isActive && option.animate ? "animate-spin" : ""}`}
                      />
                      {option.label}
                    </Button>
                  );
                })}
              </div>

              <div className="space-y-2" role="group" aria-labelledby="admin-payment-heading">
                <div className="flex items-center justify-between gap-2">
                  <p
                    id="admin-payment-heading"
                    className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold"
                  >
                    Update payment status
                  </p>
                  {order.payment && (
                    <PaymentStatusBadge status={order.payment.status} size="sm" />
                  )}
                </div>

                {/* Primary verification actions: Paid / Failed */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => handleSetPaymentStatus("paid")}
                    aria-pressed={order.payment?.status === "paid"}
                    aria-label="Mark payment as Paid"
                    className={`rounded-xl h-12 text-sm font-extrabold gap-2 transition-transform active:scale-[0.98] ${
                      order.payment?.status === "paid"
                        ? "bg-success text-success-foreground hover:bg-success/90 ring-2 ring-success/30"
                        : "bg-success/10 text-success hover:bg-success/20 border-2 border-success/30"
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Paid
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => handleSetPaymentStatus("failed")}
                    aria-pressed={order.payment?.status === "failed"}
                    aria-label="Mark payment as Failed"
                    className={`rounded-xl h-12 text-sm font-extrabold gap-2 transition-transform active:scale-[0.98] ${
                      order.payment?.status === "failed"
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-2 ring-destructive/30"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20 border-2 border-destructive/30"
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Mark Failed
                  </Button>
                </div>

                {/* Secondary states */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={order.payment?.status === "unpaid" ? "default" : "outline"}
                    onClick={() => handleSetPaymentStatus("unpaid")}
                    aria-pressed={order.payment?.status === "unpaid"}
                    className="rounded-lg h-9 text-[11px] font-bold gap-1.5"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    Waiting
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={order.payment?.status === "under_review" ? "default" : "outline"}
                    onClick={() => handleSetPaymentStatus("under_review")}
                    aria-pressed={order.payment?.status === "under_review"}
                    className="rounded-lg h-9 text-[11px] font-bold gap-1.5"
                  >
                    <Loader2 className="h-3.5 w-3.5" />
                    Under Review
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
        )}

        {/* Price breakdown */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Payment Summary</h2>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground tabular-nums">₱{order.subtotal.toLocaleString("en-US")}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-foreground tabular-nums">₱{order.shipping.toLocaleString("en-US")}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{PLATFORM_COMMISSION_LABEL}</span>
              <span className="text-foreground tabular-nums">₱{platformFee.toLocaleString("en-US")}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment</span>
              <span className="text-foreground font-medium flex items-center gap-1.5">
                {order.payment?.name ?? "Cash on Delivery"}
                <PaymentStatusBadge status={order.payment?.status ?? "unpaid"} size="sm" short />
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-3 py-3 mt-1">
            <span className="text-sm font-bold text-foreground uppercase tracking-wide">Total</span>
            <span className="text-xl font-extrabold text-primary tabular-nums">₱{order.total.toLocaleString("en-US")}</span>
          </div>
        </Card>
      </div>

      {needsPayment && (
        <div
          className="fixed bottom-16 left-0 right-0 z-30 mx-auto max-w-md px-4 pt-3 pb-3 bg-card border-t-2 border-primary/30 shadow-[0_-8px_24px_-12px_hsl(var(--primary)/0.35)]"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold leading-none">
                Total Due
              </p>
              <p className="text-lg font-extrabold text-primary tabular-nums leading-tight">
                ₱{order.total.toLocaleString("en-US")}
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              onClick={handlePayNow}
              disabled={payingNow}
              className="h-14 px-6 rounded-2xl text-base font-extrabold gap-2 shadow-lg shadow-primary/40 ring-2 ring-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-transform tracking-wide"
            >
              {payingNow ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  {paymentStatus === "failed" ? "Retry Payment" : "Pay Now"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default OrderDetail;

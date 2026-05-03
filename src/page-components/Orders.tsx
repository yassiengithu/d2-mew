import { ChevronRight, ShoppingBag, Package, AlertCircle, Wallet, Navigation, Route, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import PaymentStatusBadge from "@/components/PaymentStatusBadge";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { useOrders } from "@/context/OrdersContext";
import { getOrderStatusVisual } from "@/lib/orderStatus";
import { calculatePlatformFee } from "@/lib/commission";
import { supabase } from "@/integrations/supabase/client";

// Status visuals are centralized in src/lib/orderStatus.ts

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const Orders = () => {
  const { orders } = useOrders();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id } : null);
      setAuthChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const unpaidOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.payment &&
          o.payment.id !== "cod" &&
          o.payment.status !== "paid" &&
          o.status !== "completed",
      ),
    [orders],
  );
  const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + o.total, 0);

  if (authChecked && !user) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="My Orders" backTo="/profile" />
        <EmptyState
          className="pt-24"
          icon={LogIn}
          title="Please log in to continue"
          description="Sign in to view orders linked to your account."
          action={
            <Button asChild className="rounded-xl h-11 px-8 text-sm font-bold">
              <Link to="/auth">Log in</Link>
            </Button>
          }
        />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
      {/* Header — unified gradient style */}
      <PageHeader
        title="My Orders"
        backTo="/profile"
        trailing={
          orders.length > 0 ? (
            <span className="text-[11px] font-semibold text-primary-foreground bg-primary-foreground/15 px-2 py-1 rounded-full">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </span>
          ) : undefined
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          className="pt-24"
          icon={ShoppingBag}
          title="No orders yet"
          description="When you place an order, it'll show up here so you can track its status."
          action={
            <Button asChild className="rounded-xl h-11 px-8 text-sm font-bold">
              <Link to="/products">Start Shopping</Link>
            </Button>
          }
        />
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {unpaidOrders.length > 0 && (
            <Card className="p-3 border-2 border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {unpaidOrders.length} unpaid {unpaidOrders.length === 1 ? "order" : "orders"}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    Complete payment of{" "}
                    <span className="font-bold text-destructive tabular-nums">
                      ₱{unpaidTotal.toLocaleString("en-US")}
                    </span>{" "}
                    to start processing.
                  </p>
                  {unpaidOrders.length === 1 && (
                    <Button
                      asChild
                      size="sm"
                      className="mt-2 h-8 rounded-lg text-[11px] font-bold px-3 gap-1"
                    >
                      <Link to={`/orders/${encodeURIComponent(unpaidOrders[0].id)}`}>
                        <Wallet className="h-3.5 w-3.5" />
                        Pay now
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
          {orders.map((order) => {
            const statusVisual = getOrderStatusVisual(order.status);
            const previewItems = order.items.slice(0, 3);
            const remaining = order.items.length - previewItems.length;
            const firstItem = order.items[0];
            const platformFee = calculatePlatformFee(order.subtotal);

            return (
              <Link
                key={order.id}
                to={`/orders/${encodeURIComponent(order.id)}`}
                className="block rounded-2xl active:scale-[0.99] transition-transform"
              >
                <Card className="overflow-hidden p-0 relative">
                  {/* Status-tinted left edge for at-a-glance scanning */}
                  <span
                    className={`absolute inset-y-0 left-0 w-1 ${statusVisual.bar}`}
                    aria-hidden
                  />
                  {/* Status strip */}
                  <div className="flex items-center justify-between gap-2 px-4 py-2 bg-secondary/40 border-b border-border pl-5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <OrderStatusBadge status={order.status} size="sm" />
                      {order.payment && (
                        <PaymentStatusBadge status={order.payment.status} size="sm" />
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDate(order.placedAt)}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    {/* Status message */}
                    <div className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 ${statusVisual.surface} border`}>
                      <statusVisual.icon
                        className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${statusVisual.animate ? "animate-spin" : ""}`}
                        aria-hidden
                      />
                      <p className="text-[11px] font-semibold leading-snug">
                        {statusVisual.headline}
                      </p>
                    </div>

                    {/* Order id + chevron */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="text-xs font-mono text-muted-foreground truncate">{order.id}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>

                    {/* Item preview row */}
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {previewItems.map((item) => (
                          <div
                            key={item.id}
                            className="h-11 w-11 rounded-xl bg-secondary ring-2 ring-card flex items-center justify-center text-lg"
                          >
                            {item.img}
                          </div>
                        ))}
                        {remaining > 0 && (
                          <div className="h-11 w-11 rounded-xl bg-secondary ring-2 ring-card flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                            +{remaining}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {firstItem.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>

                    {/* Courier + tracking */}
                    <div className="rounded-xl bg-secondary/50 px-3 py-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Route className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-foreground truncate">
                            {order.courier.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {order.courier.etaDays}
                        </span>
                      </div>
                      {order.trackingNumber && (
                        <div className="flex items-center justify-between gap-2 text-[11px] rounded-lg bg-primary/10 px-2.5 py-1.5">
                          <span className="text-primary font-bold flex items-center gap-1">
                            <Navigation className="h-3 w-3" /> Tracking
                          </span>
                          <span className="font-mono font-semibold text-foreground truncate">
                            {order.trackingNumber}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-semibold">Platform fee</span>
                        <span className="text-foreground font-semibold tabular-nums">
                          ₱{platformFee.toLocaleString("en-US")}
                        </span>
                      </div>
                    <div className="flex items-end justify-between">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
                        Total
                      </span>
                      <span className="text-base font-bold text-primary leading-none">
                        ₱{order.total.toLocaleString("en-US")}
                      </span>
                    </div>
                    </div>

                    {order.payment &&
                      order.payment.id !== "cod" &&
                      order.payment.status !== "paid" &&
                      order.status !== "completed" && (
                        (() => {
                          const ps = order.payment.status;
                          const tone =
                            ps === "failed"
                              ? "bg-destructive/10 border-destructive/20 text-destructive"
                              : ps === "under_review"
                                ? "bg-info/10 border-info/20 text-info"
                                : "bg-warning/10 border-warning/20 text-warning";
                          const message =
                            ps === "failed"
                              ? "Payment failed — retry"
                              : ps === "under_review"
                                ? "Verifying your payment"
                                : "Payment required";
                          return (
                            <div className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${tone}`}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-[11px] font-semibold truncate">
                                  {message}
                                </span>
                              </div>
                              <PaymentStatusBadge status={ps} size="sm" short />
                            </div>
                          );
                        })()
                      )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Orders;

import { ArrowLeft, CheckCircle, Package, MapPin, Receipt, AlertCircle, Truck, User, Phone, Wallet, Smartphone, CreditCard, Loader2, ShieldCheck, Lock, Copy, Clock, Upload, Image as ImageIcon, X, LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/context/CartContext";
import { useOrders, type PaymentStatus } from "@/context/OrdersContext";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VISUALS } from "@/lib/paymentStatus";
import PaymentStatusBadge from "@/components/PaymentStatusBadge";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import BottomActionBar from "@/components/BottomActionBar";
import PageHeader from "@/components/PageHeader";
import { loadSavedContact, saveContact, loadSavedAddresses, CONTACT_UPDATED_EVENT, type SavedAddress } from "@/lib/contactStorage";
import { trackProductPurchases } from "@/lib/analytics";
import { calculatePlatformFee } from "@/lib/commission";
import { recordOrder, updateOrderPaymentStatus } from "@/server/orders.functions";
import { validateContact, type ContactFieldErrors } from "@/lib/contactValidation";
import AddressEditorDialog from "@/components/AddressEditorDialog";
import { ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { fetchRates, createShipment, DEFAULT_SENDER_ADDRESS } from "@/lib/easyshipClient";
import type { CourierRate } from "@/components/CourierSelector";

type CourierId = "jnt" | "ninja" | "flash";
type Courier = {
  id: CourierId;
  name: string;
  fee: number;
  etaDays: string;
  etaMaxDays: number;
  badge?: string;
};

const COURIERS: Courier[] = [
  { id: "jnt", name: "J&T Express", fee: 65, etaDays: "2–4 days", etaMaxDays: 4, badge: "Popular" },
  { id: "ninja", name: "Ninja Van", fee: 70, etaDays: "2–3 days", etaMaxDays: 3 },
  { id: "flash", name: "Flash Express", fee: 55, etaDays: "3–5 days", etaMaxDays: 5, badge: "Cheapest" },
];

type PaymentMethodId = "cod" | "gcash" | "card";

type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  desc: string;
  icon: typeof Wallet;
  badge?: string;
  /** Tailwind classes for the icon tile (bg + text). Used for brand-like accent. */
  tileClass: string;
  /** Short trust/info hint shown when selected */
  hint: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "cod",
    name: "Cash on Delivery",
    desc: "Pay with cash when your order arrives",
    icon: Wallet,
    badge: "No fees",
    tileClass: "bg-success/15 text-success",
    hint: "Have exact cash ready for the rider.",
  },
  {
    id: "gcash",
    name: "GCash",
    desc: "Pay via GCash wallet",
    icon: Smartphone,
    tileClass: "bg-info/15 text-info",
    hint: "You'll be redirected to confirm in GCash.",
  },
  {
    id: "card",
    name: "Credit / Debit Card",
    desc: "Visa, Mastercard, JCB",
    icon: CreditCard,
    tileClass: "bg-primary/15 text-primary",
    hint: "Encrypted & secure checkout.",
  },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const { addOrder, updatePaymentStatus, attachShipment, updateOrderStatus } = useOrders();
  const [confirmed, setConfirmed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [name, setName] = useState(() => loadSavedContact().name);
  const [phone, setPhone] = useState(() => loadSavedContact().phone);
  const [address, setAddress] = useState(() => loadSavedContact().address);
  const [courierId, setCourierId] = useState<CourierId>("jnt");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  // Live Easyship rates (optional)
  const [liveRates, setLiveRates] = useState<CourierRate[] | null>(null);
  const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const selectedLiveRate =
    liveRates?.find(
      (r, i) => (r.courier_id ?? `${r.courier_name}-${i}`) === selectedLiveId,
    ) ?? null;
  const [paymentId, setPaymentId] = useState<PaymentMethodId>(() => {
    try {
      const saved = localStorage.getItem("shop:lastPaymentMethod") as PaymentMethodId | null;
      if (saved && PAYMENT_METHODS.some((p) => p.id === saved)) return saved;
    } catch { /* ignore */ }
    return "cod";
  });
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [placedOrder, setPlacedOrder] = useState<{
    orderId: string;
    placedAt: Date;
    itemCount: number;
    subtotal: number;
    shipping: number;
    total: number;
    name: string;
    phone: string;
    address: string;
    courier: Courier;
    payment: PaymentMethod & { status: PaymentStatus };
  } | null>(null);
  const [proofFile, setProofFile] = useState<{ name: string; size: number; previewUrl: string } | null>(null);
  const proofInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleProofSelected = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    if (proofFile?.previewUrl) URL.revokeObjectURL(proofFile.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    setProofFile({ name: file.name, size: file.size, previewUrl });
    // Flip payment status to "Under Verification" once proof is attached
    if (placedOrder && placedOrder.payment.status !== "paid") {
      setPlacedOrder({
        ...placedOrder,
        payment: { ...placedOrder.payment, status: "under_review" },
      });
      updatePaymentStatus(placedOrder.orderId, "under_review");
    }
    toast.success("Proof submitted — payment under verification");
  };

  const removeProof = () => {
    if (proofFile?.previewUrl) URL.revokeObjectURL(proofFile.previewUrl);
    setProofFile(null);
    if (proofInputRef.current) proofInputRef.current.value = "";
    // Revert status back to "Waiting for Payment" if not yet paid
    if (placedOrder && placedOrder.payment.status === "under_review") {
      setPlacedOrder({
        ...placedOrder,
        payment: { ...placedOrder.payment, status: "unpaid" },
      });
      updatePaymentStatus(placedOrder.orderId, "unpaid");
    }
  };

  // Multi-address state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => loadSavedAddresses());
  const initialDefault = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialDefault ? initialDefault.id : null,
  );
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      const next = loadSavedAddresses();
      setSavedAddresses(next);
      // If currently selected address was removed, fall back to default/first
      if (selectedAddressId && !next.some((a) => a.id === selectedAddressId)) {
        const fallback = next.find((a) => a.isDefault) ?? next[0];
        if (fallback) {
          setSelectedAddressId(fallback.id);
          setName(fallback.name);
          setPhone(fallback.phone);
          setAddress(fallback.address);
        } else {
          setSelectedAddressId(null);
        }
      }
    };
    window.addEventListener(CONTACT_UPDATED_EVENT, handler);
    return () => window.removeEventListener(CONTACT_UPDATED_EVENT, handler);
  }, [selectedAddressId]);

  const selectAddress = (addr: SavedAddress | null) => {
    if (!addr) {
      // "Use new address" — clear fields but keep selection state null
      setSelectedAddressId(null);
      setName("");
      setPhone("");
      setAddress("");
      return;
    }
    setSelectedAddressId(addr.id);
    setName(addr.name);
    setPhone(addr.phone);
    setAddress(addr.address);
  };

  const selectedAddress = selectedAddressId
    ? savedAddresses.find((a) => a.id === selectedAddressId) ?? null
    : null;

  const baseCourier = COURIERS.find((c) => c.id === courierId) ?? COURIERS[0];
  // When a live Easyship rate is picked, it takes precedence over the static list.
  const selectedCourier: Courier = selectedLiveRate
    ? {
        id: courierId, // keep enum id for legacy tracking-url helper
        name: selectedLiveRate.courier_name,
        fee: Math.round(selectedLiveRate.cost ?? baseCourier.fee),
        etaDays:
          selectedLiveRate.min_days && selectedLiveRate.max_days
            ? `${selectedLiveRate.min_days}–${selectedLiveRate.max_days} days`
            : baseCourier.etaDays,
        etaMaxDays: selectedLiveRate.max_days ?? baseCourier.etaMaxDays,
        badge: "Live",
      }
    : baseCourier;
  const selectedPayment = PAYMENT_METHODS.find((p) => p.id === paymentId) ?? PAYMENT_METHODS[0];
  const shippingFee = selectedCourier.fee;
  const grandTotal = totalPrice + shippingFee;

  const itemCount = typeof totalItems === "number"
    ? totalItems
    : items.reduce((s, i) => s + i.qty, 0);

  const validate = () => {
    const result = validateContact({ name, phone, address });
    if (result.ok) {
      setErrors({});
      // Apply normalized phone back to field for consistent display/storage
      if (result.data.phone !== phone) setPhone(result.data.phone);
      return true;
    }
    setErrors((result as { ok: false; errors: ContactFieldErrors }).errors);
    return false;
  };

  const handleFetchLiveRates = async () => {
    if (!postalCode.trim() || !city.trim()) {
      toast.error("Enter destination city and postal code first");
      return;
    }
    setRatesLoading(true);
    setRatesError(null);
    try {
      const rates = await fetchRates({
        destination: {
          country_alpha2: "PH",
          city: city.trim(),
          postal_code: postalCode.trim(),
        },
        parcel: { weight_kg: 1, length_cm: 20, width_cm: 15, height_cm: 10 },
        declared_value: Math.max(100, Math.round(totalPrice)),
      });
      setLiveRates(rates);
      if (rates.length > 0) {
        const id = rates[0].courier_id ?? `${rates[0].courier_name}-0`;
        setSelectedLiveId(id);
        toast.success(`${rates.length} live rate${rates.length === 1 ? "" : "s"} loaded`);
      } else {
        toast.info("No live couriers available — using standard options.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not fetch live rates";
      setRatesError(msg);
      toast.error(msg);
    } finally {
      setRatesLoading(false);
    }
  };

  const tryCreateShipment = async (orderId: string, dbOrderId: string) => {
    if (!selectedLiveRate?.courier_id) return; // only when a real Easyship courier is picked
    try {
      const created = await createShipment({
        courierId: selectedLiveRate.courier_id,
        parcel: { weight_kg: 1, length_cm: 20, width_cm: 15, height_cm: 10 },
        receiver: {
          contact_name: name,
          contact_phone: phone,
          contact_email: user?.email,
          line_1: address,
          country_alpha2: "PH",
          city: city.trim() || "Manila",
          postal_code: postalCode.trim() || "1000",
        },
        orderId: dbOrderId,
      });
      attachShipment(orderId, {
        easyshipShipmentId: created.easyship_shipment_id ?? null,
        trackingNumber: created.tracking_number ?? null,
        labelUrl: created.label_url ?? null,
        courierId: selectedLiveRate.courier_id,
        courierName: created.courier_name ?? selectedLiveRate.courier_name,
        cost: created.cost ?? selectedLiveRate.cost,
        currency: created.currency ?? selectedLiveRate.currency,
      });
      if (created.tracking_number) {
        toast.success(`Shipment created · ${created.tracking_number}`);
      } else {
        toast.success("Shipment created");
      }
    } catch (err) {
      console.warn("auto shipment creation failed", err);
      toast.error(
        err instanceof Error ? err.message : "Could not create shipment automatically",
      );
    }
  };

  const handlePlaceOrder = () => {
    if (!validate()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setReviewOpen(true);
  };

  const handleConfirmOrder = () => {
    setReviewOpen(false);
    void finalizeOrder();
  };

  const finalizeOrder = async () => {
    setProcessing(true);
    const placedAt = new Date();
    const timePart = Date.now().toString(36).toUpperCase().slice(-6);
    const randPart = Math.random().toString(36).toUpperCase().slice(2, 6).padEnd(4, "X");
    const orderId = `SH-${timePart}-${randPart}`;
    // DB row uses a UUID; PayMongo metadata.order_id references this UUID so the
    // webhook can find the order to mark paid.
    const dbOrderId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const paymentStatus: PaymentStatus = "unpaid";
    const snapshot = {
      orderId,
      placedAt,
      itemCount: totalItems,
      subtotal: totalPrice,
      shipping: shippingFee,
      total: grandTotal,
      name,
      phone,
      address,
      courier: selectedCourier,
      payment: { ...selectedPayment, status: paymentStatus },
    };
    const courierPrefix = selectedCourier.id.slice(0, 3).toUpperCase();
    const trackingNumber = `${courierPrefix}${Math.floor(100000000 + Math.random() * 900000000)}PH`;
    addOrder({
      id: orderId,
      placedAt: placedAt.toISOString(),
      status: "pending",
      trackingNumber,
      items: items.map(({ product: p, qty }) => ({
        id: p.id,
        name: p.name,
        img: p.img,
        price: p.price,
        qty,
        source: p.source,
        sellerName: p.seller.name,
      })),
      itemCount: totalItems,
      subtotal: totalPrice,
      shipping: shippingFee,
      total: grandTotal,
      name,
      phone,
      address,
      courier: { ...selectedCourier },
      payment: { id: selectedPayment.id, name: selectedPayment.name, status: paymentStatus },
    });
    saveContact({ name, phone, address });
    try { localStorage.setItem("shop:lastPaymentMethod", selectedPayment.id); } catch { /* ignore */ }
    trackProductPurchases(items.map(({ product: p, qty }) => ({ id: p.id, qty })));

    // Persist the order. For online payments use 'pending_payment'; COD stays 'pending'.
    const isOnline = selectedPayment.id === "gcash" || selectedPayment.id === "card";
    const dbPaymentStatus: "pending" | "paid" | "failed" = "pending";
    // Commission is computed from grand total to match the DB trigger
    // (calculate_order_commission uses total_amount). The trigger recomputes
    // these on status='completed', so this is mainly for the initial pending row.
    const commission = calculatePlatformFee(grandTotal);
    const sellerEarnings = Math.max(0, Math.round((grandTotal - commission) * 100) / 100);
    try {
      await recordOrder({
        data: {
          id: dbOrderId,
          total_amount: grandTotal,
          commission_amount: commission,
          seller_earnings: sellerEarnings,
          payment_status: dbPaymentStatus,
          status: isOnline ? "pending_payment" : "pending",
        },
      });
    } catch (err) {
      console.warn("recordOrder failed", err);
    }

    // Online payment → create PayMongo Checkout Session and redirect.
    if (isOnline) {
      try {
        const { createPayMongoCheckout } = await import("@/lib/paymongo");
        const origin = window.location.origin;
        const session = await createPayMongoCheckout({
          lineItems: [
            ...items.map(({ product: p, qty }) => ({
              name: p.name,
              quantity: qty,
              amount: p.price,
            })),
            ...(shippingFee > 0
              ? [{ name: `Shipping (${selectedCourier.name})`, quantity: 1, amount: shippingFee }]
              : []),
          ],
          successUrl: `${origin}/orders/${orderId}?payment=success`,
          cancelUrl: `${origin}/orders/${orderId}?payment=cancelled`,
          referenceNumber: orderId,
          description: `Order ${orderId}`,
          customerEmail: user?.email,
          orderId: dbOrderId,
        });
        setPlacedOrder(snapshot);
        clearCart();
        window.location.href = session.checkout_url;
        return;
      } catch (err: any) {
        console.error("PayMongo checkout error", err);
        toast.error(err?.message ?? "Could not start payment. Please try again.");
        setProcessing(false);
        return;
      }
    }

    // COD path
    setPlacedOrder(snapshot);
    setConfirmed(true);
    clearCart();
    setProcessing(false);
    // Fire-and-forget shipment creation when a live courier was picked.
    void tryCreateShipment(orderId, dbOrderId);
  };

  if (confirmed && placedOrder) {
    const eta = new Date(
      placedOrder.placedAt.getTime() + placedOrder.courier.etaMaxDays * 24 * 60 * 60 * 1000
    );
    const etaLabel = eta.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
    const placedLabel = placedOrder.placedAt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-24">
        <PageHeader title="Order Placed" backTo={null} />

        <div className="px-4 pt-4 pb-4 animate-fade-in">
          {/* Success badge */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <p className="text-lg font-bold text-foreground">Order Confirmed!</p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Thank you for your purchase. We've sent a confirmation to your phone.
            </p>
          </div>

          {/* Payment status banner — Waiting for Payment / Under Verification / Paid */}
          {(() => {
            const status = placedOrder.payment.status;
            const v = PAYMENT_STATUS_VISUALS[status];
            const Icon = v.icon;
            const detail =
              status === "paid"
                ? `Paid via ${placedOrder.payment.name}. We'll notify you once your order ships.`
                : status === "under_review"
                  ? "Thanks! We're verifying your proof of payment. This usually takes a few minutes."
                  : placedOrder.payment.id === "cod"
                    ? `Prepare ₱${placedOrder.total.toLocaleString("en-US")} in cash for the rider on delivery.`
                    : `Open ${placedOrder.payment.name} to finish payment. Your order will be processed once payment is confirmed.`;
            return (
              <div
                className={`mt-5 rounded-xl px-3.5 py-3 flex items-start gap-2.5 border-2 ${v.surface} ${v.ring}`}
                role="status"
              >
                <Icon
                  className={`h-4 w-4 shrink-0 mt-0.5 ${v.text} ${v.spin ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-bold leading-tight ${v.text}`}>
                      {PAYMENT_STATUS_LABELS[status]}
                    </p>
                    <PaymentStatusBadge status={status} size="sm" hideIcon withDot />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{detail}</p>
                </div>
              </div>
            );
          })()}

          {/* Hero summary tile — Order ID + Total at-a-glance */}
          <div
            className="mt-6 rounded-2xl p-4 text-primary-foreground shadow-card"
            style={{ background: "var(--gradient-primary)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">Order ID</p>
                <p className="text-sm font-bold tabular-nums truncate">{placedOrder.orderId}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">
                  Total {placedOrder.payment.status === "paid" ? "Paid" : "Due"}
                </p>
                <p className="text-xl font-extrabold tabular-nums">₱{placedOrder.total.toLocaleString("en-US")}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-primary-foreground/20 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Truck className="h-4 w-4 shrink-0 opacity-90" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">Courier</p>
                  <p className="text-xs font-bold truncate">{placedOrder.courier.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <placedOrder.payment.icon className="h-4 w-4 shrink-0 opacity-90" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">Payment</p>
                  <p className="text-xs font-bold truncate">{placedOrder.payment.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order details card */}
          <div className="mt-3 rounded-2xl bg-card shadow-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Placed</p>
                <p className="text-xs font-semibold text-foreground">{placedLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Arrives by</p>
                <p className="text-xs font-semibold text-foreground">{etaLabel}</p>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Items</span>
                <span className="text-xs font-semibold text-foreground">
                  {placedOrder.itemCount} {placedOrder.itemCount === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Subtotal</span>
                <span className="text-xs font-semibold text-foreground">
                  ₱{placedOrder.subtotal.toLocaleString("en-US")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Shipping ({placedOrder.courier.name})
                </span>
                <span className="text-xs font-semibold text-foreground">
                  ₱{placedOrder.shipping.toLocaleString("en-US")}
                </span>
              </div>
            </div>
          </div>

          {/* Manual payment instructions — GCash / Card */}
          {placedOrder.payment.status !== "paid" && placedOrder.payment.id !== "cod" && (
            <div className="mt-3 rounded-2xl bg-card shadow-card p-4 space-y-4 border-2 border-warning/40 ring-1 ring-warning/10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <placedOrder.payment.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground leading-tight">
                  How to pay via {placedOrder.payment.name}
                </h3>
              </div>

              {placedOrder.payment.id === "gcash" ? (
                <>
                  {/* Amount — hero tile so users immediately see what to send */}
                  <div
                    className="rounded-xl p-3.5 text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <p className="text-[11px] uppercase tracking-wide font-semibold opacity-80">Send exactly</p>
                    <p className="text-2xl font-extrabold tabular-nums leading-tight">
                      ₱{placedOrder.total.toLocaleString("en-US")}
                    </p>
                  </div>

                  {/* GCash number — large, copy-friendly */}
                  <div className="rounded-xl bg-secondary/70 p-3.5 space-y-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                        GCash Number
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-lg font-extrabold text-foreground tabular-nums tracking-wide">
                          0917 555 0123
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText("09175550123");
                            toast.success("GCash number copied");
                          }}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-bold active:scale-95 transition-transform min-h-[36px]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-border pt-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
                        Account Name
                      </p>
                      <p className="text-sm font-bold text-foreground">SH*P SHOP PH</p>
                    </div>
                    <div className="border-t border-border pt-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
                        Reference / Message
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-foreground tabular-nums truncate">
                          {placedOrder.orderId}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(placedOrder.orderId);
                            toast.success("Order ID copied");
                          }}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-2 text-xs font-bold active:bg-primary/20 transition-colors min-h-[36px]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Steps */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                      Steps
                    </p>
                    <ol className="space-y-2">
                      {[
                        <>Open GCash and tap <span className="font-bold text-foreground">Send Money</span>.</>,
                        <>Enter the GCash number and exact amount above.</>,
                        <>Paste the <span className="font-bold text-foreground">Order ID</span> as the message.</>,
                        <>Send the receipt screenshot to our support chat.</>,
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-foreground leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="rounded-xl p-3.5 text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <p className="text-[11px] uppercase tracking-wide font-semibold opacity-80">Amount to charge</p>
                    <p className="text-2xl font-extrabold tabular-nums leading-tight">
                      ₱{placedOrder.total.toLocaleString("en-US")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/70 p-3.5 space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Secure card payment
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      A payment link will be sent to your phone. Tap it to enter your card details on our secure page.
                    </p>
                    <div className="border-t border-border pt-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Reference</p>
                        <p className="text-sm font-bold text-foreground tabular-nums truncate">{placedOrder.orderId}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(placedOrder.orderId);
                          toast.success("Reference copied");
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-2 text-xs font-bold active:bg-primary/20 transition-colors min-h-[36px]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Upload proof of payment — placeholder (no backend) */}
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                  Upload proof of payment
                </p>
                <input
                  ref={proofInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleProofSelected(e.target.files?.[0] ?? null)}
                />
                {proofFile ? (
                  <div className="rounded-xl border border-border bg-secondary/40 p-2.5 flex items-center gap-3">
                    <img
                      src={proofFile.previewUrl}
                      alt="Proof of payment preview"
                      className="h-14 w-14 rounded-lg object-cover bg-muted shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{proofFile.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                        {(proofFile.size / 1024).toFixed(0)} KB · Ready for review
                      </p>
                      <button
                        type="button"
                        onClick={() => proofInputRef.current?.click()}
                        className="text-[11px] font-bold text-primary active:opacity-70 mt-0.5"
                      >
                        Replace
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={removeProof}
                      aria-label="Remove proof of payment"
                      className="shrink-0 h-8 w-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center active:bg-secondary/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => proofInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-5 flex flex-col items-center justify-center gap-1.5 active:bg-primary/10 transition-colors min-h-[96px]"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Tap to upload screenshot</span>
                    <span className="text-[11px] text-muted-foreground text-center px-2">
                      JPG or PNG, up to 5 MB · Helps us verify faster
                    </span>
                  </button>
                )}
                <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Keep your receipt available until payment is verified.
                </p>
              </div>

              {/* Deadline — strong, mobile-visible */}
              <div className="flex items-start gap-2 rounded-xl bg-warning/15 border border-warning/30 px-3 py-2.5">
                <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-warning leading-tight">Pay within 24 hours</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Your order will be cancelled automatically if payment isn't received in time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery card */}
          <div className="mt-3 rounded-2xl bg-card shadow-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Delivery</h3>
            </div>
            <div className="rounded-xl bg-success/10 px-3 py-2 flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-success shrink-0" />
              <span className="text-xs font-semibold text-success">
                {placedOrder.courier.name} · Arrives by {etaLabel}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs font-semibold text-foreground">{placedOrder.name}</p>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-foreground">{placedOrder.phone}</p>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{placedOrder.address}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 space-y-2.5">
            <Button asChild className="w-full rounded-xl h-12 text-sm font-bold">
              <Link to="/orders">Track My Order</Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl h-11 text-sm font-semibold">
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  if (authChecked && !user) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="Checkout" />
        <div className="flex flex-col items-center justify-center gap-5 pt-28 px-8">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
            <LogIn className="h-9 w-9 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">Please log in to continue</p>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Sign in or create an account to complete your purchase.
          </p>
          <Button asChild className="rounded-xl h-11 px-8 text-sm font-bold mt-2">
            <Link to="/auth">Log In</Link>
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="Checkout" />
        <div className="flex flex-col items-center justify-center gap-5 pt-28 px-8">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
            <Package className="h-9 w-9 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">Nothing to checkout</p>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">Add items to your cart first.</p>
          <Button asChild className="rounded-xl h-11 px-8 text-sm font-bold mt-2">
            <Link to="/products">Browse Products</Link>
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-32">
      <PageHeader title="Checkout" />

      <div className="px-4 pt-4 space-y-4">
        {/* Order summary */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Order Summary</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
          <div className="space-y-2.5">
            {items.map(({ product: p, qty }) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-card shadow-card p-3">
                <div className="shrink-0 h-14 w-14 rounded-lg bg-secondary flex items-center justify-center text-2xl">
                  {p.img}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{p.name}</p>
                  <span className="inline-block mt-1 text-[10px] font-medium text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                    Qty {qty}
                  </span>
                </div>
                <p className="text-sm font-bold text-primary shrink-0">₱{(p.price * qty).toLocaleString("en-US")}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery details */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Delivery Details</h2>
            </div>
            {savedAddresses.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    {selectedAddress
                      ? selectedAddress.label || "Saved address"
                      : "Use new address"}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {savedAddresses.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onClick={() => selectAddress(a)}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {a.label || a.name}
                        </span>
                        {a.isDefault && (
                          <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            DEFAULT
                          </span>
                        )}
                        {selectedAddressId === a.id && (
                          <span className="ml-auto text-primary text-xs">✓</span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground line-clamp-1 w-full">
                        {a.address}
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => selectAddress(null)} className="text-xs">
                    Use a new address
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditorOpen(true)} className="text-xs gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add new address
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="rounded-xl bg-card shadow-card p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
              <Input
                id="name"
                placeholder="Full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                maxLength={100}
                autoComplete="name"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                className={`h-12 text-base ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {errors.name && (
                <p id="name-error" className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {errors.name}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="09XX XXX XXXX"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                maxLength={15}
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="next"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
                className={`h-12 text-base ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {errors.phone ? (
                <p id="phone-error" className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {errors.phone}
                </p>
              ) : (
                <p id="phone-hint" className="text-[11px] text-muted-foreground">We'll text delivery updates.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="address" className="text-sm font-medium text-foreground">Delivery Address</Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">{address.length}/500</span>
              </div>
              <Textarea
                id="address"
                placeholder="House/Unit No., Street, Barangay, City"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
                }}
                maxLength={500}
                rows={3}
                autoComplete="street-address"
                autoCapitalize="words"
                enterKeyHint="done"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? "address-error" : undefined}
                className={`text-base resize-none ${errors.address ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {errors.address && (
                <p id="address-error" className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {errors.address}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Courier selection */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <Truck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Choose Courier</h2>
          </div>

          {/* Live Easyship rates */}
          <div className="rounded-xl bg-card shadow-card p-3 mb-2.5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Destination city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-10 text-sm"
                maxLength={120}
              />
              <Input
                placeholder="Postal code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="h-10 text-sm"
                maxLength={20}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFetchLiveRates}
              disabled={ratesLoading}
              className="w-full h-10 rounded-lg text-xs font-bold"
            >
              {ratesLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Calculating live rates…
                </>
              ) : (
                <>
                  <Truck className="h-3.5 w-3.5 mr-1.5" />
                  Calculate live shipping rates
                </>
              )}
            </Button>
            {ratesError && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {ratesError}
              </p>
            )}
            {liveRates && liveRates.length > 0 && (
              <RadioGroup
                value={selectedLiveId ?? ""}
                onValueChange={(v) => setSelectedLiveId(v)}
                className="space-y-1.5 pt-1"
              >
                {liveRates.map((r, idx) => {
                  const id = r.courier_id ?? `${r.courier_name}-${idx}`;
                  const active = selectedLiveId === id;
                  return (
                    <Label
                      key={id}
                      htmlFor={`live-${id}`}
                      className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer ${
                        active ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <RadioGroupItem id={`live-${id}`} value={id} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {r.courier_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.min_days && r.max_days
                            ? `${r.min_days}–${r.max_days} days`
                            : "ETA varies"}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-primary tabular-nums">
                        ₱{Math.round(r.cost ?? 0)}
                      </p>
                    </Label>
                  );
                })}
              </RadioGroup>
            )}
            <p className="text-[10px] text-muted-foreground">
              Live rates are powered by Easyship — picking one auto-creates a real shipment with tracking after you place the order.
            </p>
          </div>

          <RadioGroup
            value={courierId}
            onValueChange={(v) => setCourierId(v as CourierId)}
            className="space-y-2"
          >
            {COURIERS.map((c) => {
              const active = courierId === c.id;
              return (
                <Label
                  key={c.id}
                  htmlFor={`courier-${c.id}`}
                  className={`relative flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                    active
                      ? "bg-primary/5 ring-2 ring-primary shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.35)] scale-[1.01]"
                      : "bg-card shadow-card ring-1 ring-border hover:ring-primary/40 active:scale-[0.99]"
                  }`}
                >
                  <RadioGroupItem
                    id={`courier-${c.id}`}
                    value={c.id}
                    className={active ? "border-primary text-primary" : ""}
                  />
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-sm line-clamp-1 ${active ? "font-bold text-primary" : "font-semibold text-foreground"}`}>
                        {c.name}
                      </p>
                      {c.badge && (
                        <span className="text-[9px] font-bold uppercase tracking-wide bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                          {c.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{c.etaDays}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>
                      ₱{c.fee}
                    </p>
                    {active && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                        <CheckCircle className="h-2.5 w-2.5" /> Selected
                      </span>
                    )}
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </section>

        {/* Payment method */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Payment Method</h2>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Lock className="h-3 w-3" />
              Secure
            </span>
          </div>
          <RadioGroup
            value={paymentId}
            onValueChange={(v) => setPaymentId(v as PaymentMethodId)}
            className="space-y-2"
          >
            {PAYMENT_METHODS.map((p) => {
              const active = paymentId === p.id;
              const Icon = p.icon;
              return (
                <Label
                  key={p.id}
                  htmlFor={`pay-${p.id}`}
                  className={`relative block rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${
                    active
                      ? "bg-primary/5 ring-2 ring-primary shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.4)]"
                      : "bg-card shadow-card ring-1 ring-border hover:ring-primary/40 active:scale-[0.99]"
                  }`}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ background: "var(--gradient-primary)" }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${p.tileClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-sm line-clamp-1 ${active ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                          {p.name}
                        </p>
                        {p.badge && (
                          <span className="text-[9px] font-bold uppercase tracking-wide bg-success/15 text-success rounded-full px-1.5 py-0.5">
                            {p.badge}
                          </span>
                        )}
                        {p.id !== "cod" && (
                          <span className="text-[9px] font-bold uppercase tracking-wide bg-secondary text-muted-foreground rounded-full px-1.5 py-0.5">
                            Manual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.desc}</p>
                    </div>
                    <RadioGroupItem
                      id={`pay-${p.id}`}
                      value={p.id}
                      className={`shrink-0 ${active ? "border-primary text-primary" : ""}`}
                    />
                  </div>
                  {active && (
                    <div className="flex items-center gap-1.5 px-3 pb-2.5 -mt-0.5 animate-fade-in">
                      <ShieldCheck className="h-3 w-3 text-primary shrink-0" />
                      <p className="text-[10.5px] text-muted-foreground leading-tight">{p.hint}</p>
                    </div>
                  )}
                </Label>
              );
            })}
          </RadioGroup>
        </section>

        {/* Price breakdown */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <Receipt className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Payment Summary</h2>
          </div>
          <div className="rounded-xl bg-card shadow-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/60 rounded-lg px-3 py-2">
              <selectedPayment.icon className="h-3.5 w-3.5 text-primary" />
              <span className="flex-1 truncate">Paying with {selectedPayment.name}</span>
              {selectedPayment.id !== "cod" && (
                <span className="text-[9px] font-bold uppercase tracking-wide bg-secondary text-muted-foreground rounded-full px-1.5 py-0.5 shrink-0">
                  Manual
                </span>
              )}
            </div>

            {/* Itemized breakdown */}
            <div className="space-y-2.5">
              {/* Product subtotal */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Package className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Product Subtotal</p>
                    <p className="text-[11px] text-muted-foreground">
                      {itemCount} {itemCount === 1 ? "item" : "items"} from your cart
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                  ₱{totalPrice.toLocaleString("en-US")}
                </span>
              </div>

              {/* Shipping fee */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Truck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Shipping Fee</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {selectedCourier.name} · {selectedCourier.etaDays}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                  ₱{shippingFee.toLocaleString("en-US")}
                </span>
              </div>
            </div>

            {/* Grand total */}
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <div>
                <p className="text-base font-bold text-foreground leading-tight">
                  Total {selectedPayment.id === "cod" ? "Due" : "to Pay"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Subtotal + shipping, all-in
                </p>
              </div>
              <span className="text-lg font-bold text-primary tabular-nums">
                ₱{grandTotal.toLocaleString("en-US")}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Place order bar */}
      <BottomActionBar className="z-50">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Total</p>
            <p className="text-base font-bold text-primary leading-tight">₱{grandTotal.toLocaleString("en-US")}</p>
          </div>
          <Button
            className="h-11 rounded-xl text-sm font-bold px-6 shrink-0"
            onClick={handlePlaceOrder}
          >
            Place Order
          </Button>
        </div>
      </BottomActionBar>

      {/* Review & Confirm Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 text-left">
            <DialogTitle className="text-base font-bold text-foreground">Review Your Order</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please confirm the details below before placing your order.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[55vh] px-5">
            <div className="space-y-4 pb-2">
              {/* Items */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Items</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {totalItems} {totalItems === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="space-y-2 rounded-xl bg-secondary/40 p-3">
                  {items.map(({ product: p, qty }) => (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <div className="shrink-0 h-9 w-9 rounded-lg bg-card flex items-center justify-center text-lg">
                        {p.img}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">Qty {qty} · ₱{p.price.toLocaleString("en-US")}</p>
                      </div>
                      <p className="text-xs font-bold text-primary shrink-0">
                        ₱{(p.price * qty).toLocaleString("en-US")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Delivery */}
              <section>
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Deliver To</h3>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs font-semibold text-foreground">{name}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-foreground">{phone}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{address}</p>
                  </div>
                </div>
              </section>

              {/* Courier */}
              <section>
                <div className="flex items-center gap-1.5 mb-2">
                  <Truck className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Courier</h3>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{selectedCourier.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedCourier.etaDays}</p>
                  </div>
                  <p className="text-xs font-bold text-primary shrink-0">₱{shippingFee.toLocaleString("en-US")}</p>
                </div>
              </section>

              {/* Payment Method */}
              <section>
                <div className="flex items-center gap-1.5 mb-2">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Payment Method</h3>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <selectedPayment.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{selectedPayment.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{selectedPayment.desc}</p>
                  </div>
                </div>
              </section>

              {/* Full Price Breakdown */}
              <section>
                <div className="flex items-center gap-1.5 mb-2">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Price Breakdown</h3>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3 space-y-2.5">
                  {/* Product subtotal row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <Package className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">Product Subtotal</p>
                        <p className="text-[10px] text-muted-foreground">
                          {totalItems} {totalItems === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                      ₱{totalPrice.toLocaleString("en-US")}
                    </span>
                  </div>

                  {/* Shipping fee row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <Truck className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">Shipping Fee</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {selectedCourier.name} · {selectedCourier.etaDays}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                      ₱{shippingFee.toLocaleString("en-US")}
                    </span>
                  </div>

                  {/* Grand total */}
                  <div className="border-t border-border pt-2.5 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-foreground leading-tight">
                        Grand Total
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <selectedPayment.icon className="h-2.5 w-2.5" />
                        via {selectedPayment.name}
                        {selectedPayment.id === "cod" ? " · Pay on delivery" : ""}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-primary tabular-nums">
                      ₱{grandTotal.toLocaleString("en-US")}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>

          <DialogFooter className="px-5 py-4 border-t border-border bg-card flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl text-sm font-semibold"
              onClick={() => setReviewOpen(false)}
            >
              Edit
            </Button>
            <Button
              className="flex-1 h-11 rounded-xl text-sm font-bold"
              onClick={handleConfirmOrder}
            >
              Confirm Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing payment dialog (mock gateway) */}
      <Dialog open={processing}>
        <DialogContent
          className="max-w-[85vw] sm:max-w-xs rounded-2xl p-0 gap-0 overflow-hidden [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Processing payment</DialogTitle>
            <DialogDescription>Please wait while we confirm your payment.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center text-center px-6 py-8 gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <p className="text-sm font-bold text-foreground">
              Processing {selectedPayment.name} payment…
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Securely confirming your payment of{" "}
              <span className="font-semibold text-foreground">
                ₱{grandTotal.toLocaleString("en-US")}
              </span>
              .
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <AddressEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={null}
        onSaved={(addr) => selectAddress(addr)}
      />

      <BottomNav />
    </div>
  );
};

export default Checkout;

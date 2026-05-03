// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Truck, Package, ExternalLink, Loader2, Check, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type OrderRow = {
  id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  selected_courier_id: string | null;
  selected_courier_name: string | null;
  tracking_number: string | null;
  user_id: string;
};

type ShipmentRow = {
  id: string;
  order_id: string;
  courier_name: string;
  courier_type: "api" | "manual";
  shipping_cost: number;
  currency: string;
  tracking_number: string | null;
  label_url: string | null;
  status: string;
  external_shipment_id: string | null;
};

const SHIPMENT_STATUSES = [
  "pending",
  "awaiting_dropoff",
  "booked",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "returned",
  "cancelled",
];

const groupByCourier = (orders: OrderRow[]) => {
  const groups: Record<string, OrderRow[]> = {};
  for (const o of orders) {
    const key = o.selected_courier_name || "Unassigned";
    if (!groups[key]) groups[key] = [];
    groups[key].push(o);
  }
  return groups;
};

const AdminShipments = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [shipments, setShipments] = useState<Record<string, ShipmentRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: ordersData, error: oErr } = await supabase
      .from("orders")
      .select("id,status,payment_status,total_amount,created_at,selected_courier_id,selected_courier_name,tracking_number,user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (oErr) {
      setError(oErr.message);
      setLoading(false);
      return;
    }
    setOrders(ordersData ?? []);

    const ids = (ordersData ?? []).map((o) => o.id);
    if (ids.length > 0) {
      const { data: shipData } = await supabase
        .from("shipments")
        .select("id,order_id,courier_name,courier_type,shipping_cost,currency,tracking_number,label_url,status,external_shipment_id")
        .in("order_id", ids);
      const map: Record<string, ShipmentRow> = {};
      for (const s of shipData ?? []) map[s.order_id] = s;
      setShipments(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => groupByCourier(orders), [orders]);

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Link to="/admin-dashboard" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1">
              <ArrowLeft className="h-3 w-3" /> Back to dashboard
            </Link>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" /> Shipments
            </h1>
            <p className="text-sm text-muted-foreground">Orders grouped by courier. Manually fulfill J&T orders here.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
          </Button>
        </header>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        {loading && orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([courier, list]) => (
              <CourierGroup
                key={courier}
                courierName={courier}
                orders={list}
                shipments={shipments}
                onChanged={load}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

const CourierGroup = ({
  courierName,
  orders,
  shipments,
  onChanged,
}: {
  courierName: string;
  orders: OrderRow[];
  shipments: Record<string, ShipmentRow>;
  onChanged: () => void;
}) => {
  const isJT = /j&?t/i.test(courierName);
  const isEasyship = /easyship/i.test(courierName);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          {courierName}
          <span className="text-xs font-normal text-muted-foreground">({orders.length})</span>
        </CardTitle>
        <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
          isEasyship ? "bg-success/10 text-success" : isJT ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
        }`}>
          {isEasyship ? "API · Auto" : isJT ? "Manual" : "—"}
        </span>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {orders.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              shipment={shipments[o.id]}
              isJT={isJT}
              isEasyship={isEasyship}
              onChanged={onChanged}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

const OrderRow = ({
  order,
  shipment,
  isJT,
  isEasyship,
  onChanged,
}: {
  order: OrderRow;
  shipment?: ShipmentRow;
  isJT: boolean;
  isEasyship: boolean;
  onChanged: () => void;
}) => {
  const [tracking, setTracking] = useState(shipment?.tracking_number ?? order.tracking_number ?? "");
  const [status, setStatus] = useState(shipment?.status ?? "pending");
  const [saving, setSaving] = useState(false);

  const hasShipment = !!shipment;

  const fetchCourierId = async () => {
    const code = isEasyship ? "easyship" : "jnt";
    const { data } = await supabase.from("couriers").select("id,name,type").eq("code", code).maybeSingle();
    return data;
  };

  const bookJT = async () => {
    setSaving(true);
    try {
      const courier = await fetchCourierId();
      const trimmed = tracking.trim();
      if (!trimmed) {
        toast.error("Enter a tracking number first");
        setSaving(false);
        return;
      }

      if (hasShipment) {
        const { error } = await supabase
          .from("shipments")
          .update({ tracking_number: trimmed, status: "booked" })
          .eq("id", shipment!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shipments").insert({
          order_id: order.id,
          courier_id: courier?.id ?? null,
          courier_name: courier?.name ?? "J&T Express",
          courier_type: "manual",
          shipping_cost: 0,
          currency: "PHP",
          tracking_number: trimmed,
          status: "booked",
          metadata: { manual: true },
        });
        if (error) throw error;
      }

      await supabase
        .from("orders")
        .update({ tracking_number: trimmed, status: "shipped" })
        .eq("id", order.id);

      toast.success(`Order ${order.id.slice(0, 8)} marked as Booked`);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to book shipment");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!hasShipment) {
      toast.error("Book the shipment first");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("shipments")
        .update({ status: newStatus })
        .eq("id", shipment!.id);
      if (error) throw error;
      // also log a tracking event
      await supabase.from("tracking_events").insert({
        shipment_id: shipment!.id,
        status: newStatus,
        message: `Status updated to ${newStatus} by admin`,
      });
      setStatus(newStatus);
      toast.success(`Status updated to ${newStatus}`);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/orders/${order.id}`} className="font-mono text-xs text-muted-foreground hover:text-foreground">
              #{order.id.slice(0, 8)}
            </Link>
            <span className="text-xs capitalize text-muted-foreground">{order.status}</span>
            <span className="text-xs font-semibold text-foreground">₱{Number(order.total_amount).toLocaleString("en-US")}</span>
            <span className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
          </div>

          {hasShipment ? (
            <div className="mt-1.5 flex items-center gap-3 text-xs flex-wrap">
              <span className="text-muted-foreground">Tracking:</span>
              <span className="font-mono font-semibold text-foreground">{shipment!.tracking_number ?? "—"}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium capitalize">{shipment!.status}</span>
              {shipment!.label_url && (
                <a href={shipment!.label_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                  Label <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : isJT ? (
            <p className="mt-1 text-xs font-semibold text-warning">Pending Fulfillment</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">No shipment data yet.</p>
          )}
        </div>
      </div>

      {/* Admin actions for J&T (or any unassigned) */}
      {isJT && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end bg-muted/30 rounded-lg p-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Tracking number</Label>
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="JT123456789PH"
              className="h-9 text-sm"
            />
          </div>
          <Button size="sm" onClick={bookJT} disabled={saving} className="h-9">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" /> Mark Booked</>}
          </Button>
          {hasShipment && (
            <Select value={status} onValueChange={updateStatus} disabled={saving}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="Update status" />
              </SelectTrigger>
              <SelectContent>
                {SHIPMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </li>
  );
};

export default AdminShipments;

// Unified logistics interface — single entry point for the app.
// Components should import from here, never from individual handlers.
import { supabase } from "@/integrations/supabase/client";
import { getCourier, listCouriers, registerCourier } from "./registry";
import type { OrderLike, Rate, Shipment, TrackingResult } from "./types";

export type {
  OrderLike,
  Rate,
  Shipment,
  TrackingResult,
  TrackingEvent,
  CourierHandler,
  Address,
  Parcel,
} from "./types";
export { registerCourier, listCouriers };

/** Get rates from every active courier, sorted cheapest first. */
export const getRates = async (order: OrderLike): Promise<Rate[]> => {
  const settled = await Promise.allSettled(
    listCouriers().map((h) => h.getRates(order)),
  );
  const rates: Rate[] = [];
  for (const s of settled) if (s.status === "fulfilled") rates.push(...s.value);
  return rates.sort((a, b) => a.cost - b.cost);
};

/** Create a shipment with the courier referenced by `rate.courier_code`. */
export const createShipment = async (
  order: OrderLike,
  rate: Rate,
): Promise<Shipment> => {
  const handler = getCourier(rate.courier_code);
  const shipment = await handler.createShipment(order, rate);
  await persistShipment(shipment);
  return shipment;
};

/**
 * Unified tracking. Accepts either an order ID or a tracking number.
 * Returns the standardized shape: courier_name, tracking_number, status,
 * estimated_delivery, plus the event timeline.
 */
export const trackShipment = async (
  query: string,
): Promise<TrackingResult & { courier_name: string | null; estimated_delivery: string | null }> => {
  const q = query.trim();
  if (!q) {
    return empty();
  }

  // 1) Try as order ID
  let shipment = await findShipmentByOrder(q);
  // 2) Otherwise try as tracking number
  if (!shipment) shipment = await findShipmentByTracking(q);

  if (!shipment) return empty();

  const code = shipment.courier_code;
  if (!shipment.tracking_number) {
    return {
      tracking_number: null,
      current_status: shipment.status ?? "pending",
      courier_name: shipment.courier_name,
      estimated_delivery: null,
      events: [],
      manual: shipment.courier_type === "manual",
    };
  }

  try {
    const handler = getCourier(code);
    const result = await handler.trackShipment(shipment.tracking_number);
    return {
      ...result,
      courier_name: result.courier_name ?? shipment.courier_name,
      estimated_delivery: result.estimated_delivery ?? null,
    };
  } catch {
    return {
      tracking_number: shipment.tracking_number,
      current_status: shipment.status ?? "unknown",
      courier_name: shipment.courier_name,
      estimated_delivery: null,
      events: [],
      manual: shipment.courier_type === "manual",
    };
  }
};

const empty = () => ({
  tracking_number: null,
  current_status: "no_shipment",
  courier_name: null,
  estimated_delivery: null,
  events: [],
  manual: false,
});

type ShipmentRow = {
  courier_code: string;
  courier_name: string;
  courier_type: "api" | "manual";
  tracking_number: string | null;
  status: string;
};

const resolveCourierCode = async (courierId: string | null): Promise<string> => {
  if (!courierId) return "jt";
  const { data } = await supabase
    .from("couriers")
    .select("code")
    .eq("id", courierId)
    .maybeSingle();
  return data?.code ?? "jt";
};

const findShipmentByOrder = async (orderId: string): Promise<ShipmentRow | null> => {
  const { data } = await supabase
    .from("shipments")
    .select("courier_id,courier_name,courier_type,tracking_number,status")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!data) return null;
  return {
    courier_code: await resolveCourierCode(data.courier_id),
    courier_name: data.courier_name,
    courier_type: data.courier_type as "api" | "manual",
    tracking_number: data.tracking_number,
    status: data.status,
  };
};

const findShipmentByTracking = async (tn: string): Promise<ShipmentRow | null> => {
  const { data } = await supabase
    .from("shipments")
    .select("courier_id,courier_name,courier_type,tracking_number,status")
    .eq("tracking_number", tn)
    .maybeSingle();
  if (!data) return null;
  return {
    courier_code: await resolveCourierCode(data.courier_id),
    courier_name: data.courier_name,
    courier_type: data.courier_type as "api" | "manual",
    tracking_number: data.tracking_number,
    status: data.status,
  };
};

const persistShipment = async (s: Shipment) => {
  const { data: courier } = await supabase
    .from("couriers")
    .select("id")
    .eq("code", s.courier_code)
    .maybeSingle();

  const { error } = await supabase.from("shipments").insert([
    {
      order_id: s.order_id,
      courier_id: courier?.id ?? null,
      courier_name: s.courier_name,
      courier_type: s.courier_type,
      shipping_cost: s.shipping_cost,
      currency: s.currency,
      tracking_number: s.tracking_number,
      label_url: s.label_url,
      external_shipment_id: s.external_shipment_id ?? null,
      status: s.status,
      metadata: (s.metadata ?? {}) as never,
    },
  ]);
  if (error) throw new Error(error.message);

  await supabase
    .from("orders")
    .update({
      selected_courier_id: courier?.id ?? null,
      selected_courier_name: s.courier_name,
      tracking_number: s.tracking_number,
    })
    .eq("id", s.order_id);
};

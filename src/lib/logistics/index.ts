// Unified logistics interface — single entry point for the app.
// Components should import from here, never from individual handlers.
import { supabase } from "@/integrations/supabase/client";
import { getCourier, listCouriers, registerCourier } from "./registry";
import type { OrderLike, Rate, Shipment, TrackingResult } from "./types";

export type { OrderLike, Rate, Shipment, TrackingResult, CourierHandler, Address, Parcel } from "./types";
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

/** Look up a shipment by order, then ask the courier handler to track it. */
export const trackShipment = async (orderId: string): Promise<TrackingResult> => {
  const { data: shipment, error } = await supabase
    .from("shipments")
    .select("courier_code:courier_id,courier_name,courier_type,tracking_number,status")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!shipment) {
    return { tracking_number: null, current_status: "no_shipment", events: [], manual: false };
  }

  // Resolve handler by code lookup against the couriers table.
  const { data: courier } = await supabase
    .from("couriers")
    .select("code")
    .eq("id", shipment.courier_code as unknown as string)
    .maybeSingle();
  const code = courier?.code ?? "jt";

  if (!shipment.tracking_number) {
    return {
      tracking_number: null,
      current_status: shipment.status ?? "pending",
      events: [],
      manual: shipment.courier_type === "manual",
    };
  }
  return getCourier(code).trackShipment(shipment.tracking_number);
};

const persistShipment = async (s: Shipment) => {
  // Resolve courier_id by code so the FK is set.
  const { data: courier } = await supabase
    .from("couriers")
    .select("id")
    .eq("code", s.courier_code)
    .maybeSingle();

  const { error } = await supabase.from("shipments").insert({
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
    metadata: s.metadata ?? {},
  });
  if (error) throw new Error(error.message);

  // Mirror selected courier + tracking onto the order for quick reads.
  await supabase
    .from("orders")
    .update({
      selected_courier_id: courier?.id ?? null,
      selected_courier_name: s.courier_name,
      tracking_number: s.tracking_number,
    })
    .eq("id", s.order_id);
};

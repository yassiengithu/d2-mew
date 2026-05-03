// J&T Express — manual fulfillment (no API yet).
// Rates are quoted from a simple weight-tier table; shipments are created as
// "awaiting_dropoff" and tracking events come from the tracking_events table
// (entered by ops/admin until a real API integration exists).
import { supabase } from "@/integrations/supabase/client";
import type { CourierHandler, OrderLike, Rate, Shipment, TrackingResult } from "../types";

const FLAT_RATE_PHP = (weightKg: number) => {
  if (weightKg <= 1) return 89;
  if (weightKg <= 3) return 129;
  if (weightKg <= 5) return 179;
  return 179 + Math.ceil(weightKg - 5) * 25;
};

export const jtHandler: CourierHandler = {
  code: "jt",
  name: "J&T Express",
  type: "manual",

  async getRates(order) {
    const cost = FLAT_RATE_PHP(order.parcel.weight_kg);
    return [
      {
        courier_code: "jt",
        courier_name: "J&T Express",
        service_name: "Standard",
        cost,
        currency: "PHP",
        min_delivery_days: 2,
        max_delivery_days: 5,
      },
    ];
  },

  async createShipment(order, rate) {
    const r = rate ?? (await this.getRates(order))[0];
    return {
      order_id: order.id,
      courier_code: "jt",
      courier_name: "J&T Express",
      courier_type: "manual",
      shipping_cost: r.cost,
      currency: r.currency,
      tracking_number: null, // assigned later when manually dispatched
      label_url: null,
      external_shipment_id: null,
      status: "awaiting_dropoff",
      metadata: { manual: true, instructions: "Drop off at nearest J&T branch." },
    };
  },

  async trackShipment(trackingNumber) {
    // Manual courier: read events from our own DB.
    const { data: shipment } = await supabase
      .from("shipments")
      .select("id,status")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (!shipment) {
      return { tracking_number: trackingNumber, current_status: "unknown", events: [], manual: true };
    }

    const { data: events } = await supabase
      .from("tracking_events")
      .select("status,location,message,occurred_at")
      .eq("shipment_id", shipment.id)
      .order("occurred_at", { ascending: true });

    return {
      tracking_number: trackingNumber,
      current_status: shipment.status ?? "pending",
      events: events ?? [],
      manual: true,
    };
  },
};

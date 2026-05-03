// Easyship handler — wraps the existing edge-function client.
import { supabase } from "@/integrations/supabase/client";
import { fetchRates, createShipment as createEasyshipShipment } from "@/lib/easyshipClient";
import type { CourierHandler, OrderLike, Rate, Shipment, TrackingResult } from "../types";

export const easyshipHandler: CourierHandler = {
  code: "easyship",
  name: "Easyship",
  type: "api",

  async getRates(order) {
    const rates = await fetchRates({
      destination: {
        country_alpha2: order.receiver.country_alpha2,
        city: order.receiver.city,
        postal_code: order.receiver.postal_code,
        line_1: order.receiver.line_1,
      },
      parcel: {
        weight_kg: order.parcel.weight_kg,
        length_cm: order.parcel.length_cm,
        width_cm: order.parcel.width_cm,
        height_cm: order.parcel.height_cm,
      },
      declared_value: order.parcel.declared_value,
    });
    return rates.map<Rate>((r) => ({
      courier_code: "easyship",
      courier_name: r.courier_name ?? "Easyship",
      service_name: r.courier_name,
      cost: r.cost ?? 0,
      currency: r.currency ?? "PHP",
      min_delivery_days: r.min_delivery_time,
      max_delivery_days: r.max_delivery_time,
      provider_rate_id: r.courier_id,
    }));
  },

  async createShipment(order, rate) {
    if (!rate?.provider_rate_id) {
      throw new Error("Easyship requires a selected rate (provider_rate_id).");
    }
    const res = await createEasyshipShipment({
      courierId: rate.provider_rate_id,
      parcel: {
        weight_kg: order.parcel.weight_kg,
        length_cm: order.parcel.length_cm,
        width_cm: order.parcel.width_cm,
        height_cm: order.parcel.height_cm,
      },
      receiver: {
        contact_name: order.receiver.contact_name,
        contact_phone: order.receiver.contact_phone,
        contact_email: order.receiver.contact_email,
        line_1: order.receiver.line_1,
        country_alpha2: order.receiver.country_alpha2,
        city: order.receiver.city,
        postal_code: order.receiver.postal_code,
      },
      orderId: order.id,
    });
    return {
      order_id: order.id,
      courier_code: "easyship",
      courier_name: rate.courier_name,
      courier_type: "api",
      shipping_cost: rate.cost,
      currency: rate.currency,
      tracking_number: res.tracking_number ?? null,
      label_url: res.label_url ?? null,
      external_shipment_id: res.easyship_shipment_id ?? null,
      status: "label_created",
    };
  },

  async trackShipment(trackingNumber) {
    const { data, error } = await supabase.functions.invoke("easyship-track", {
      body: { tracking_number: trackingNumber },
    });
    if (error) throw new Error(error.message);
    const events = (data?.events ?? []) as Array<{
      status: string;
      location?: string;
      message?: string;
      occurred_at: string;
    }>;
    return {
      tracking_number: trackingNumber,
      current_status: data?.status ?? events.at(-1)?.status ?? "unknown",
      events,
      manual: false,
    };
  },
};

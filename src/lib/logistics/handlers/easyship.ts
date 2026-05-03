// Easyship handler — wraps the mock/sandbox client.
import {
  fetchRates,
  createShipment as createEasyshipShipment,
  trackShipment as trackEasyshipShipment,
} from "@/lib/easyshipClient";
import type { CourierHandler, Rate, Shipment, TrackingResult } from "../types";

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
      parcel: order.parcel,
      declared_value: order.parcel.declared_value,
    });
    return rates.map<Rate>((r) => ({
      courier_code: "easyship",
      courier_name: r.courier_name ?? "Easyship",
      service_name: r.courier_name,
      cost: r.cost ?? 0,
      currency: r.currency ?? "PHP",
      min_delivery_days: r.min_days ?? undefined,
      max_delivery_days: r.max_days ?? undefined,
      provider_rate_id: r.courier_id ?? undefined,
    }));
  },

  async createShipment(order, rate) {
    if (!rate?.provider_rate_id) {
      throw new Error("Easyship requires a selected rate (provider_rate_id).");
    }
    const res = await createEasyshipShipment({
      courierId: rate.provider_rate_id,
      parcel: order.parcel,
      receiver: {
        contact_name: order.receiver.contact_name,
        contact_phone: order.receiver.contact_phone,
        contact_email: order.receiver.contact_email ?? "buyer@example.com",
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
      courier_name: res.courier_name ?? rate.courier_name,
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
    const res = await trackEasyshipShipment(trackingNumber);
    return {
      tracking_number: res.tracking_number,
      current_status: res.status,
      courier_name: res.courier_name ?? "Easyship",
      estimated_delivery: res.estimated_delivery,
      events: res.events.map((e) => ({
        status: e.status,
        location: e.location ?? null,
        message: e.message ?? null,
        occurred_at: e.occurred_at,
      })),
      manual: false,
    };
  },
};

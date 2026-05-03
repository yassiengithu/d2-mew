// Shared logistics types — courier-agnostic.

export type CourierType = "api" | "manual";

export type Courier = {
  id: string;
  code: string;
  name: string;
  type: CourierType;
  active: boolean;
};

export type Address = {
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  line_1: string;
  city: string;
  postal_code: string;
  country_alpha2: string;
};

export type Parcel = {
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  declared_value?: number;
  currency?: string;
};

export type OrderLike = {
  id: string;
  user_id: string;
  items?: Array<{ product_id: number | string; qty: number; name?: string }>;
  receiver: Address;
  sender?: Address;
  parcel: Parcel;
};

export type Rate = {
  courier_code: string;
  courier_name: string;
  service_name?: string;
  cost: number;
  currency: string;
  min_delivery_days?: number;
  max_delivery_days?: number;
  // Provider-specific id used when creating a shipment (e.g. Easyship courier_id).
  provider_rate_id?: string;
};

export type Shipment = {
  id?: string;
  order_id: string;
  courier_code: string;
  courier_name: string;
  courier_type: CourierType;
  shipping_cost: number;
  currency: string;
  tracking_number: string | null;
  label_url: string | null;
  external_shipment_id?: string | null;
  status: string;
  metadata?: Record<string, unknown>;
};

export type TrackingEvent = {
  status: string;
  location?: string | null;
  message?: string | null;
  occurred_at: string;
};

export type TrackingResult = {
  tracking_number: string | null;
  current_status: string;
  events: TrackingEvent[];
  // True when the courier has no API and updates come from manual fulfillment.
  manual: boolean;
};

// Unified handler contract every courier must implement.
export interface CourierHandler {
  readonly code: string;
  readonly name: string;
  readonly type: CourierType;

  getRates(order: OrderLike): Promise<Rate[]>;
  createShipment(order: OrderLike, rate?: Rate): Promise<Shipment>;
  trackShipment(trackingNumber: string): Promise<TrackingResult>;
}

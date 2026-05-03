// Easyship client — SANDBOX/MOCK MODE.
// Returns deterministic, realistic data. Swap this file with a real
// fetch-based implementation (or edge-function call) once an API key is added.
import type { CourierRate } from "@/components/CourierSelector";

export type ParcelDims = {
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
};

export type EasyshipAddress = {
  country_alpha2: string;
  city: string;
  postal_code: string;
  line_1?: string;
};

export const DEFAULT_SENDER_ADDRESS = {
  country_alpha2: "PH",
  city: "Manila",
  postal_code: "1000",
  line_1: "Warehouse A, 1 Marketplace Ave",
  contact_name: "Sh*p Shop PH",
  contact_phone: "+639175550123",
  contact_email: "ops@shipshop.local",
};

const seededRand = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const MOCK_COURIERS = [
  { id: "es-ninja-standard", name: "Ninja Van Standard", min: 2, max: 4, base: 95 },
  { id: "es-jnt-express", name: "J&T Express (via Easyship)", min: 2, max: 5, base: 110 },
  { id: "es-flash-priority", name: "Flash Express Priority", min: 1, max: 3, base: 145 },
  { id: "es-lbc-air", name: "LBC Air Cargo", min: 1, max: 2, base: 195 },
];

export const fetchRates = async (params: {
  origin?: EasyshipAddress;
  destination: EasyshipAddress;
  parcel: ParcelDims;
  declared_value?: number;
}): Promise<CourierRate[]> => {
  const rand = seededRand(
    `${params.destination.postal_code}|${params.parcel.weight_kg}`,
  );
  await new Promise((r) => setTimeout(r, 300));
  const weight = Math.max(0.5, params.parcel.weight_kg);
  const rates = MOCK_COURIERS.map((c) => ({
    courier_id: c.id,
    courier_name: c.name,
    cost: Math.round((c.base + weight * 18 + rand() * 25) * 100) / 100,
    currency: "PHP",
    min_days: c.min,
    max_days: c.max,
  })) as CourierRate[];
  rates.sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
  return rates;
};

export type CreatedShipment = {
  id?: string;
  easyship_shipment_id?: string | null;
  tracking_number?: string | null;
  label_url?: string | null;
  courier_name?: string | null;
  cost?: number | null;
  currency?: string | null;
};

export const createShipment = async (params: {
  courierId: string;
  parcel: ParcelDims;
  receiver: {
    contact_name: string;
    contact_phone: string;
    contact_email?: string;
    line_1: string;
    country_alpha2: string;
    city: string;
    postal_code: string;
  };
  sender?: typeof DEFAULT_SENDER_ADDRESS;
  orderId?: string;
}): Promise<CreatedShipment> => {
  await new Promise((r) => setTimeout(r, 400));
  const rand = seededRand(`${params.orderId ?? params.courierId}|${Date.now()}`);
  const trackingNumber = `EZ${Math.floor(rand() * 1e10)
    .toString()
    .padStart(10, "0")}PH`;
  const courier = MOCK_COURIERS.find((c) => c.id === params.courierId);
  return {
    easyship_shipment_id: `mock_${Math.floor(rand() * 1e8)}`,
    tracking_number: trackingNumber,
    label_url: `https://mock.easyship.local/labels/${trackingNumber}.pdf`,
    courier_name: courier?.name ?? "Easyship Courier",
    currency: "PHP",
  };
};

export type EasyshipTrackingEvent = {
  status: string;
  location?: string;
  message?: string;
  occurred_at: string;
};

export type EasyshipTracking = {
  tracking_number: string;
  status: string;
  courier_name: string | null;
  estimated_delivery: string | null;
  events: EasyshipTrackingEvent[];
};

export const trackShipment = async (
  trackingNumber: string,
): Promise<EasyshipTracking> => {
  await new Promise((r) => setTimeout(r, 250));
  const rand = seededRand(trackingNumber);
  // Deterministic progress based on tracking number — mock advances over time.
  const ageHours =
    (Date.now() % (1000 * 60 * 60 * 96)) / (1000 * 60 * 60); // 0–96
  const stage = Math.min(4, Math.floor(ageHours / 18));
  const stages: Array<{ status: string; location: string; message: string }> = [
    { status: "label_created", location: "Manila Hub", message: "Shipment label created" },
    { status: "picked_up", location: "Manila Hub", message: "Picked up by courier" },
    { status: "in_transit", location: "Quezon City Sortation", message: "Departed sorting facility" },
    { status: "out_for_delivery", location: "Local Branch", message: "Out for delivery" },
    { status: "delivered", location: "Recipient address", message: "Delivered successfully" },
  ];
  const events: EasyshipTrackingEvent[] = [];
  const start = Date.now() - stage * 1000 * 60 * 60 * 12;
  for (let i = 0; i <= stage; i++) {
    events.push({
      ...stages[i],
      occurred_at: new Date(start + i * 1000 * 60 * 60 * 12).toISOString(),
    });
  }
  const eta = new Date(Date.now() + (4 - stage) * 1000 * 60 * 60 * 12);
  return {
    tracking_number: trackingNumber,
    status: stages[stage].status,
    courier_name: MOCK_COURIERS[Math.floor(rand() * MOCK_COURIERS.length)].name,
    estimated_delivery: eta.toISOString(),
    events,
  };
};

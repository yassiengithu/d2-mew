// Browser-side helpers for the Easyship edge functions.
import { supabase } from "@/integrations/supabase/client";
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

// Default sender (store) address — used by checkout when creating shipments.
// Adjust here if your warehouse moves.
export const DEFAULT_SENDER_ADDRESS = {
  country_alpha2: "PH",
  city: "Manila",
  postal_code: "1000",
  line_1: "Warehouse A, 1 Marketplace Ave",
  contact_name: "Sh*p Shop PH",
  contact_phone: "+639175550123",
  contact_email: "ops@shipshop.local",
};

export const fetchRates = async (params: {
  origin?: EasyshipAddress;
  destination: EasyshipAddress;
  parcel: ParcelDims;
  declared_value?: number;
}): Promise<CourierRate[]> => {
  const { data, error } = await supabase.functions.invoke("easyship-rates", {
    body: {
      origin: params.origin ?? {
        country_alpha2: DEFAULT_SENDER_ADDRESS.country_alpha2,
        city: DEFAULT_SENDER_ADDRESS.city,
        postal_code: DEFAULT_SENDER_ADDRESS.postal_code,
      },
      destination: params.destination,
      ...params.parcel,
      declared_value: params.declared_value ?? 100,
      currency: "PHP",
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error ?? "Failed to fetch rates");
  const rates: CourierRate[] = (data.rates ?? []).filter(
    (r: CourierRate) => r.cost !== null,
  );
  rates.sort((a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity));
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
  orderId?: string; // db UUID
}): Promise<CreatedShipment> => {
  const sender = params.sender ?? DEFAULT_SENDER_ADDRESS;
  const { data, error } = await supabase.functions.invoke(
    "easyship-create-shipment",
    {
      body: {
        courier_id: params.courierId,
        sender,
        receiver: params.receiver,
        parcel: { ...params.parcel, declared_value: 100, currency: "PHP" },
        order_id: params.orderId,
      },
    },
  );
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error ?? "Failed to create shipment");
  return data as CreatedShipment;
};

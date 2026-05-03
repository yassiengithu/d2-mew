import { supabase } from "@/integrations/supabase/client";

export type PayMongoSourceType = "gcash" | "grab_pay" | "paymaya" | "card";

export interface CreateSourceInput {
  /** Amount in PHP (e.g., 199.50). Will be converted to centavos. */
  amountPhp: number;
  type: PayMongoSourceType;
  description?: string;
  successUrl: string;
  failedUrl: string;
  remarks?: string;
}

export interface PayMongoSource {
  id: string;
  status: string;
  checkout_url: string;
  type: string;
}

/**
 * Create a PayMongo source via our secure edge function.
 * The secret key never touches the browser.
 */
export async function createPayMongoSource(input: CreateSourceInput): Promise<PayMongoSource> {
  const amount = Math.round(input.amountPhp * 100);
  const { data, error } = await supabase.functions.invoke("paymongo-create-source", {
    body: {
      amount,
      currency: "PHP",
      type: input.type,
      description: input.description,
      remarks: input.remarks,
      redirect: { success: input.successUrl, failed: input.failedUrl },
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.checkout_url) throw new Error("No checkout URL returned");
  return data as PayMongoSource;
}

export interface CheckoutLineItem {
  name: string;
  quantity: number;
  /** Unit price in PHP (e.g., 199.50). Converted to centavos server-side. */
  amount: number;
  description?: string;
  currency?: string;
}

export interface CreateCheckoutInput {
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  description?: string;
  referenceNumber?: string;
  customerEmail?: string;
  orderId?: string;
}

export interface PayMongoCheckoutSession {
  id: string;
  checkout_url: string;
  reference_number?: string;
  status?: string;
}

/**
 * Create a PayMongo Checkout Session (GCash + Card enabled).
 * Returns a hosted checkout_url to redirect the buyer to.
 */
export async function createPayMongoCheckout(
  input: CreateCheckoutInput,
): Promise<PayMongoCheckoutSession> {
  const { data, error } = await supabase.functions.invoke("paymongo-create-checkout", {
    body: {
      line_items: input.lineItems.map((li) => ({
        name: li.name,
        quantity: li.quantity,
        amount: li.amount,
        currency: li.currency ?? "PHP",
        description: li.description,
      })),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      description: input.description,
      reference_number: input.referenceNumber,
      customer_email: input.customerEmail,
      order_id: input.orderId,
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.checkout_url) throw new Error("No checkout URL returned");
  return data as PayMongoCheckoutSession;
}

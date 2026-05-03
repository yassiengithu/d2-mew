// Client-side wrappers that mirror the original "@tanstack/react-start" server-fn API.
// These functions just call Supabase from the browser; RLS handles authorization.
// API surface preserved: each function accepts an optional { data: ... } argument.

import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const RecordOrderSchema = z.object({
  id: z.string().min(1),
  total_amount: z.number().nonnegative(),
  commission_amount: z.number().nonnegative(),
  seller_earnings: z.number().nonnegative(),
  payment_status: z.enum(["pending", "paid", "failed"]).default("pending"),
  status: z.string().min(1).default("pending"),
  seller_id: z.string().uuid().nullable().optional(),
});

type RecordOrderInput = z.input<typeof RecordOrderSchema>;
type Wrapped<T> = T | { data: T };

function unwrap<T>(arg: Wrapped<T> | undefined): T | undefined {
  if (arg === undefined) return undefined;
  if (typeof arg === "object" && arg !== null && "data" in (arg as object)) {
    return (arg as { data: T }).data;
  }
  return arg as T;
}

export async function recordOrder(arg: Wrapped<RecordOrderInput>) {
  const data = RecordOrderSchema.parse(unwrap(arg));
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) {
    return { ok: false as const, error: "Not authenticated" };
  }

  const { error } = await supabase.from("orders").insert({
    id: data.id,
    user_id: userId,
    seller_id: data.seller_id ?? null,
    status: data.status,
    payment_status: data.payment_status,
    total_amount: data.total_amount,
    commission_amount: data.commission_amount,
    seller_earnings: data.seller_earnings,
  });

  if (error) {
    console.error("recordOrder insert failed:", error);
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

const UpdatePaymentSchema = z.object({
  id: z.string().min(1),
  payment_status: z.enum(["pending", "paid", "failed"]),
});

export async function updateOrderPaymentStatus(
  arg: Wrapped<z.input<typeof UpdatePaymentSchema>>,
) {
  const data = UpdatePaymentSchema.parse(unwrap(arg));
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) return { ok: false as const, error: "Not authenticated" };

  const { error } = await supabase
    .from("orders")
    .update({ payment_status: data.payment_status })
    .eq("id", data.id)
    .eq("user_id", userId);

  if (error) {
    console.error("updateOrderPaymentStatus failed:", error);
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

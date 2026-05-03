import { supabase } from "@/integrations/supabase/client";

/** Fire-and-forget product view tracking. Errors are swallowed. */
export async function trackProductView(productId: number) {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase
      .from("product_views")
      .insert({ product_id: productId, viewer_id: data.user?.id ?? null });
  } catch {
    /* analytics is best-effort */
  }
}

/** Fire-and-forget purchase tracking for an order's line items. */
export async function trackProductPurchases(
  items: Array<{ id: number; qty: number }>,
) {
  if (!items.length) return;
  try {
    const { data } = await supabase.auth.getUser();
    const buyer_id = data.user?.id ?? null;
    await supabase.from("product_purchases").insert(
      items.map((i) => ({
        product_id: i.id,
        qty: i.qty,
        buyer_id,
      })),
    );
  } catch {
    /* analytics is best-effort */
  }
}

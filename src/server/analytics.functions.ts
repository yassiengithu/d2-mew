import { supabase } from "@/integrations/supabase/client";

export type ProductMetric = {
  product_id: number;
  count: number;
};

export type ProductAnalytics = {
  topViewed: ProductMetric[];
  topSelling: ProductMetric[];
};

export async function getProductAnalytics(): Promise<ProductAnalytics> {
  const [viewedRes, soldRes] = await Promise.all([
    supabase.rpc("get_top_viewed_products", { _limit: 10 }),
    supabase.rpc("get_top_selling_products", { _limit: 10 }),
  ]);

  if (viewedRes.error) throw viewedRes.error;
  if (soldRes.error) throw soldRes.error;

  const topViewed: ProductMetric[] = (viewedRes.data ?? []).map((r: any) => ({
    product_id: Number(r.product_id),
    count: Number(r.view_count),
  }));
  const topSelling: ProductMetric[] = (soldRes.data ?? []).map((r: any) => ({
    product_id: Number(r.product_id),
    count: Number(r.units_sold),
  }));

  return { topViewed, topSelling };
}

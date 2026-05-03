import { supabase } from "@/integrations/supabase/client";

export type SellerOrder = {
  id: string;
  status: string;
  total_amount: number;
  seller_earnings: number;
  created_at: string;
};

export async function getSellerOrders(): Promise<SellerOrder[]> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("id, status, total_amount, seller_earnings, created_at")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    total_amount: Number(r.total_amount),
    seller_earnings: Number(r.seller_earnings),
    created_at: r.created_at,
  }));
}

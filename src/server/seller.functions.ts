// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export type SellerOrder = {
  id: string;
  status: string;
  total_amount: number;
  seller_earnings: number;
  created_at: string;
  payment_status: string;
};

export type SellerEarning = {
  id: string;
  order_id: string;
  gross_amount: number;
  platform_fee: number;
  net_earnings: number;
  status: string;
  created_at: string;
};

export type SellerWallet = {
  pending_balance: number;
  available_balance: number;
  paid_balance: number;
};

export async function getSellerWallet(): Promise<SellerWallet> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) return { pending_balance: 0, available_balance: 0, paid_balance: 0 };

  const { data, error } = await supabase
    .from("seller_wallet")
    .select("pending_balance, available_balance, paid_balance")
    .eq("seller_id", userId)
    .maybeSingle();

  if (error) throw error;
  return {
    pending_balance: Number(data?.pending_balance ?? 0),
    available_balance: Number(data?.available_balance ?? 0),
    paid_balance: Number(data?.paid_balance ?? 0),
  };
}

export type SellerEarningsSummary = {
  earnings: SellerEarning[];
  totalGross: number;
  totalFees: number;
  totalNet: number;
  availableBalance: number;
};

export async function getSellerOrders(): Promise<SellerOrder[]> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("id, status, total_amount, seller_earnings, payment_status, created_at")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    status: r.status,
    total_amount: Number(r.total_amount),
    seller_earnings: Number(r.seller_earnings),
    payment_status: r.payment_status,
    created_at: r.created_at,
  }));
}

export async function getSellerEarningsSummary(): Promise<SellerEarningsSummary> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) return { earnings: [], totalGross: 0, totalFees: 0, totalNet: 0, availableBalance: 0 };

  const { data, error } = await supabase
    .from("seller_earnings")
    .select("*")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const earnings: SellerEarning[] = (data ?? []).map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    gross_amount: Number(r.gross_amount),
    platform_fee: Number(r.platform_fee),
    net_earnings: Number(r.net_earnings),
    status: r.status,
    created_at: r.created_at,
  }));

  const totalGross = earnings.reduce((s, e) => s + e.gross_amount, 0);
  const totalFees = earnings.reduce((s, e) => s + e.platform_fee, 0);
  const totalNet = earnings.reduce((s, e) => s + e.net_earnings, 0);
  // Available balance = released earnings not yet paid out (approved or available)
  const availableBalance = earnings
    .filter((e) => e.status === "approved" || e.status === "available")
    .reduce((s, e) => s + e.net_earnings, 0);

  return { earnings, totalGross, totalFees, totalNet, availableBalance };
}

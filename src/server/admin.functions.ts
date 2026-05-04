// Admin functions — call edge functions that use the service-role client.
import { supabase } from "@/integrations/supabase/client";

export type AdminOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
};

export type AdminOrdersOverview = {
  totalOrders: number;
  recentOrders: AdminOrder[];
};

export type AdminOrdersFilters = {
  status?: string;
  from?: string;
  to?: string;
};

type Wrapped<T> = T | { data: T };
function unwrap<T>(arg: Wrapped<T> | undefined): T | undefined {
  if (arg === undefined) return undefined;
  if (typeof arg === "object" && arg !== null && "data" in (arg as object)) {
    return (arg as { data: T }).data;
  }
  return arg as T;
}

async function call<T>(name: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in (data as any) && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data as T;
}

export async function getAdminOrdersOverview(
  arg?: Wrapped<AdminOrdersFilters>,
): Promise<AdminOrdersOverview> {
  const filters = unwrap(arg) ?? {};
  return call<AdminOrdersOverview>("admin-orders-overview", filters);
}

export type AdminUsersOverview = {
  totalUsers: number;
  totalSellers: number;
};

export async function getAdminUsersOverview(): Promise<AdminUsersOverview> {
  return call<AdminUsersOverview>("admin-users-overview");
}

export type CommissionDay = { date: string; commission: number };

export type AdminRevenueOverview = {
  totalCommission: number;
  perDay: CommissionDay[];
};

export async function getAdminRevenueOverview(): Promise<AdminRevenueOverview> {
  return call<AdminRevenueOverview>("admin-revenue-overview");
}

export type PlatformCommissionSummary = {
  totalPlatformFees: number;
  totalGross: number;
  earningsCount: number;
};

export async function getAdminPlatformCommission(): Promise<PlatformCommissionSummary> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Verify admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) throw new Error("Unauthorized");

  // Sum from orders where payment is paid (commission_amount is set by trigger)
  const { data, error } = await supabase
    .from("orders")
    .select("commission_amount, total_amount")
    .eq("payment_status", "paid");

  if (error) throw error;

  const rows = data ?? [];
  const totalPlatformFees = rows.reduce((s, r) => s + Number(r.commission_amount ?? 0), 0);
  const totalGross = rows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);

  return {
    totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
    totalGross: Math.round(totalGross * 100) / 100,
    earningsCount: rows.length,
  };
}

export type AdminPayout = {
  id: string;
  order_id: string;
  seller_id: string;
  gross_amount: number;
  platform_fee: number;
  net_earnings: number;
  status: "pending" | "approved" | "paid";
  created_at: string;
  updated_at: string;
};

async function ensureAdmin(): Promise<string> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleData) throw new Error("Unauthorized");
  return userId;
}

export async function getAdminPayouts(): Promise<AdminPayout[]> {
  await ensureAdmin();
  const { data, error } = await supabase
    .from("seller_earnings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as AdminPayout[];
}

export async function updatePayoutStatus(
  arg: Wrapped<{ id: string; status: "pending" | "approved" | "paid" }>,
): Promise<AdminPayout> {
  await ensureAdmin();
  const { id, status } = unwrap(arg)!;
  const { data, error } = await supabase
    .from("seller_earnings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AdminPayout;
}

export type PayoutRequest = {
  id: string;
  seller_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAdminPayoutRequests(): Promise<PayoutRequest[]> {
  await ensureAdmin();
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, amount: Number(r.amount) })) as PayoutRequest[];
}

export async function updatePayoutRequestStatus(
  arg: Wrapped<{ id: string; status: "approved" | "rejected"; note?: string }>,
): Promise<PayoutRequest> {
  await ensureAdmin();
  const { id, status, note } = unwrap(arg)!;
  const { data, error } = await supabase
    .from("payout_requests")
    .update({ status, admin_note: note ?? null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return { ...(data as any), amount: Number((data as any).amount) } as PayoutRequest;
}

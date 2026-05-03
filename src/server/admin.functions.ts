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

import { supabase } from "@/integrations/supabase/client";

export type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  disabled: boolean;
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

export async function listAdminUsers(): Promise<AdminUser[]> {
  return call<AdminUser[]>("admin-list-users");
}

export async function setUserDisabled(
  arg: Wrapped<{ targetUserId: string; disabled: boolean }>,
) {
  const data = unwrap(arg)!;
  return call<{ ok: true; disabled: boolean }>("admin-set-user-disabled", data);
}

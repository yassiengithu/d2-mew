import { useEffect, useState } from "react";
import { Users, ShoppingBag, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";

const StatCard = ({
  label,
  value,
  icon: Icon,
  loading,
  prefix = "",
}: {
  label: string;
  value: number | null;
  icon: typeof Users;
  loading: boolean;
  prefix?: string;
}) => (
  <div className="rounded-2xl bg-card shadow-card p-5 flex flex-col gap-3">
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
      <Icon className="h-5 w-5 text-primary-foreground" />
    </div>
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-foreground tabular-nums">
        {loading ? (
          <span className="inline-block h-7 w-16 rounded bg-muted animate-pulse align-middle" />
        ) : (
          `${prefix}${(value ?? 0).toLocaleString("en-US")}`
        )}
      </p>
    </div>
  </div>
);

const Admin = () => {
  const [totalCommission, setTotalCommission] = useState<number | null>(null);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [totalSellers, setTotalSellers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_admin_revenue_stats");
      if (cancelled) return;
      if (error) {
        setError(
          error.message?.includes("forbidden")
            ? "Admin access required."
            : "Could not load revenue stats."
        );
      } else if (data && data.length > 0) {
        const row = data[0];
        setTotalCommission(Number(row.total_commission) || 0);
        setTotalOrders(Number(row.total_orders) || 0);
        setTotalSellers(Number(row.total_sellers) || 0);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Admin Revenue" subtitle="Platform-wide performance" />

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          label="Total commission earned"
          value={totalCommission}
          icon={DollarSign}
          loading={loading}
          prefix="₱"
        />
        <StatCard
          label="Total orders"
          value={totalOrders}
          icon={ShoppingBag}
          loading={loading}
        />
        <StatCard
          label="Total sellers"
          value={totalSellers}
          icon={Users}
          loading={loading}
        />
      </div>

      {error && (
        <p className="px-4 mt-2 text-xs text-destructive">{error}</p>
      )}

      <BottomNav />
    </div>
  );
};

export default Admin;

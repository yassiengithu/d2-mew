import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { DollarSign, ShoppingCart, Users, Package, Boxes, Ban, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  getAdminOrdersOverview,
  getAdminUsersOverview,
  getAdminRevenueOverview,
  type AdminOrder,
  type CommissionDay,
} from "@/server/admin.functions";
import { listAdminUsers, setUserDisabled, type AdminUser } from "@/server/admin-users.functions";
import { getProductAnalytics, type ProductMetric } from "@/server/analytics.functions";
import { products } from "@/data/products";
import { useSubmittedProducts } from "@/context/SubmittedProductsContext";
import { Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const recentProducts = [...products].sort((a, b) => b.id - a.id).slice(0, 5);
const totalProducts = products.length;

const STATUS_OPTIONS = ["all", "pending", "completed", "cancelled", "refunded"];

function AdminDashboardPage() {
  const {
    allProducts: submissions,
    setStatus: setSubmissionStatus,
    adminRemoveProduct,
  } = useSubmittedProducts();
  const pendingSubmissions = submissions.filter((s) => s.status === "Pending Approval");
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalSellers, setTotalSellers] = useState<number | null>(null);
  const [totalCommission, setTotalCommission] = useState<number | null>(null);
  const [perDay, setPerDay] = useState<CommissionDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    setUsersError(null);
    listAdminUsers()
      .then((u) => setUsers(u))
      .catch((e: unknown) =>
        setUsersError(e instanceof Error ? e.message : "Failed to load users"),
      );
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const [topViewed, setTopViewed] = useState<ProductMetric[] | null>(null);
  const [topSelling, setTopSelling] = useState<ProductMetric[] | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    setAnalyticsError(null);
    getProductAnalytics()
      .then((a) => {
        setTopViewed(a.topViewed);
        setTopSelling(a.topSelling);
      })
      .catch((e: unknown) =>
        setAnalyticsError(e instanceof Error ? e.message : "Failed to load analytics"),
      );
  }, []);

  const productById = new Map(products.map((p) => [p.id, p]));

  const toggleDisabled = async (u: AdminUser) => {
    setPendingUserId(u.id);
    try {
      await setUserDisabled({ data: { targetUserId: u.id, disabled: !u.disabled } });
      toast.success(
        !u.disabled ? `Disabled ${u.email ?? u.id}` : `Enabled ${u.email ?? u.id}`,
      );
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setPendingUserId(null);
    }
  };

  useEffect(() => {
    let active = true;
    setError(null);
    Promise.all([
      getAdminOrdersOverview({
        data: { status, from: from || undefined, to: to || undefined },
      }),
      getAdminUsersOverview(),
      getAdminRevenueOverview(),
    ])
      .then(([orders, users, revenue]) => {
        if (!active) return;
        setTotalOrders(orders.totalOrders);
        setRecentOrders(orders.recentOrders);
        setTotalUsers(users.totalUsers);
        setTotalSellers(users.totalSellers);
        setTotalCommission(revenue.totalCommission);
        setPerDay(revenue.perDay);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load stats");
      });
    return () => {
      active = false;
    };
  }, [status, from, to]);

  const resetFilters = () => {
    setStatus("all");
    setFrom("");
    setTo("");
  };

  const maxDay = Math.max(1, ...perDay.map((d) => d.commission));

  const sections = [
    {
      title: "Revenue",
      value: totalCommission === null ? "—" : `$${totalCommission.toFixed(2)}`,
      icon: DollarSign,
      description: "Total commission",
    },
    {
      title: "Orders",
      value: totalOrders === null ? "—" : String(totalOrders),
      icon: ShoppingCart,
      description:
        status !== "all" || from || to ? "Filtered orders" : "Total orders",
    },
    {
      title: "Users",
      value: totalUsers === null ? "—" : String(totalUsers),
      icon: Users,
      description: "Registered users",
    },
    {
      title: "Sellers",
      value: totalSellers === null ? "—" : String(totalSellers),
      icon: Package,
      description: "Active sellers",
    },
    {
      title: "Products",
      value: String(totalProducts),
      icon: Boxes,
      description: "Listed products",
    },
  ];

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your marketplace
          </p>
        </header>

        <section className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Order filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="from-date" className="text-xs">From</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="to-date" className="text-xs">To</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {sections.map((s) => (
            <Card key={s.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Commission per day (last 7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalCommission === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <ul className="space-y-2">
                  {perDay.map((d) => (
                    <li key={d.date} className="flex items-center gap-3 text-sm">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">
                        {d.date.slice(5)}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${(d.commission / maxDay) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right font-medium tabular-nums text-foreground">
                        ${d.commission.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent orders</CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : totalOrders === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentOrders.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <Link to={`/orders/${o.id}`}
                        className="font-mono text-xs text-muted-foreground hover:text-foreground"
                      >
                        #{o.id.slice(0, 8)}
                      </Link>
                      <span className="capitalize text-muted-foreground">
                        {o.status}
                      </span>
                      <span className="font-medium text-foreground">
                        ${Number(o.total_amount).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold">
                Product submissions
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {pendingSubmissions.length} pending
              </span>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submissions yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {submissions.slice(0, 20).map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.sellerName} · ${s.price.toFixed(2)} · {s.category}
                        </p>
                      </div>
                      <span
                        className={
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " +
                          (s.status === "Approved"
                            ? "bg-success/10 text-success"
                            : s.status === "Rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground")
                        }
                      >
                        {s.status}
                      </span>
                      {s.status === "Pending Approval" ? (
                        <div className="flex shrink-0 gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => {
                              setSubmissionStatus(s.id, "Approved");
                              toast.success(`Approved "${s.name}"`);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-destructive hover:text-destructive"
                            onClick={() => {
                              setSubmissionStatus(s.id, "Rejected");
                              toast.success(`Rejected "${s.name}"`);
                            }}
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => {
                            setSubmissionStatus(s.id, "Pending Approval");
                            toast.success(`Reset "${s.name}" to pending`);
                          }}
                        >
                          Reset
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Delete ${s.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{s.name}" by {s.sellerName} will be permanently removed.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => {
                                adminRemoveProduct(s.id);
                                toast.success(`Deleted "${s.name}"`);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Most viewed products</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsError ? (
                <p className="text-sm text-destructive">{analyticsError}</p>
              ) : topViewed === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : topViewed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No views yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {topViewed.map((m, idx) => {
                    const p = productById.get(m.product_id);
                    return (
                      <li key={m.product_id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="w-5 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">{idx + 1}</span>
                        <span className="text-xl" aria-hidden>{p?.img ?? "📦"}</span>
                        {p ? (
                          <Link to={`/product/${String(p.id)}`} className="min-w-0 flex-1 truncate font-medium text-foreground hover:underline">{p.name}</Link>
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">Product #{m.product_id}</span>
                        )}
                        <span className="shrink-0 font-semibold tabular-nums text-foreground">{m.count.toLocaleString("en-US")}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Best-selling products</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsError ? (
                <p className="text-sm text-destructive">{analyticsError}</p>
              ) : topSelling === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : topSelling.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {topSelling.map((m, idx) => {
                    const p = productById.get(m.product_id);
                    return (
                      <li key={m.product_id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="w-5 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">{idx + 1}</span>
                        <span className="text-xl" aria-hidden>{p?.img ?? "📦"}</span>
                        {p ? (
                          <Link to={`/product/${String(p.id)}`} className="min-w-0 flex-1 truncate font-medium text-foreground hover:underline">{p.name}</Link>
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">Product #{m.product_id}</span>
                        )}
                        <span className="shrink-0 font-semibold tabular-nums text-foreground">{m.count.toLocaleString("en-US")} sold</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold">Users</CardTitle>
              <span className="text-xs text-muted-foreground">
                {users ? `${users.length} total` : "—"}
              </span>
            </CardHeader>
            <CardContent>
              {usersError ? (
                <p className="text-sm text-destructive">{usersError}</p>
              ) : users === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {users.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-3 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {u.name || u.email || u.id}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email ?? "—"} · joined{" "}
                          {new Date(u.created_at).toLocaleDateString("en-US")}
                          {u.last_sign_in_at
                            ? ` · last seen ${new Date(u.last_sign_in_at).toLocaleDateString("en-US")}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " +
                          (u.disabled
                            ? "bg-destructive/10 text-destructive"
                            : "bg-success/10 text-success")
                        }
                      >
                        {u.disabled ? "Disabled" : "Active"}
                      </span>
                      {u.disabled ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          disabled={pendingUserId === u.id}
                          onClick={() => toggleDisabled(u)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Enable
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-destructive hover:text-destructive"
                              disabled={pendingUserId === u.id}
                            >
                              <Ban className="h-3.5 w-3.5" /> Disable
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disable this account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {u.email ?? u.id} will be unable to sign in until you
                                re-enable the account.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => toggleDisabled(u)}
                              >
                                Disable
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Recently added products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {recentProducts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <Link to={`/product/${String(p.id)}`}
                      className="flex min-w-0 items-center gap-3 hover:text-foreground"
                    >
                      <span className="text-xl" aria-hidden>
                        {p.img}
                      </span>
                      <span className="truncate font-medium text-foreground">
                        {p.name}
                      </span>
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.category}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}


export default AdminDashboardPage;

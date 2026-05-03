import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Pencil,
  Trash2,
  Plus,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  XCircle,
  CircleDot,
  Star,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SellerOrderStatusKey = "pending" | "completed" | "cancelled" | "other";

const SELLER_STATUS_VISUALS: Record<
  SellerOrderStatusKey,
  { label: string; icon: LucideIcon; className: string; pulse?: boolean }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/30",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/30",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  other: {
    label: "Other",
    icon: CircleDot,
    className: "bg-muted text-muted-foreground border-border",
  },
};

const getSellerStatusVisual = (raw: string) => {
  const key = raw.toLowerCase().trim();
  const mapped: SellerOrderStatusKey =
    key === "pending" || key === "completed" || key === "cancelled"
      ? key
      : "other";
  const visual = SELLER_STATUS_VISUALS[mapped];
  return {
    ...visual,
    label: mapped === "other" ? raw || "Unknown" : visual.label,
  };
};

const SellerStatusBadge = ({ status }: { status: string }) => {
  const v = getSellerStatusVisual(status);
  const Icon = v.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        v.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {v.label}
    </span>
  );
};
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SmartImage from "@/components/SmartImage";
import { toast } from "@/hooks/use-toast";
import {
  useSubmittedProducts,
  type SubmittedProduct,
} from "@/context/SubmittedProductsContext";
import { getSellerOrders, type SellerOrder } from "@/server/seller.functions";

const editSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .finite()
    .gt(0, "Price must be greater than 0")
    .max(10_000_000),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters")
    .max(1000),
});

function SellerDashboardPage() {
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { products, updateProduct, removeProduct, setFeatured } =
    useSubmittedProducts();
  const [editing, setEditing] = useState<SubmittedProduct | null>(null);
  const [deleting, setDeleting] = useState<SubmittedProduct | null>(null);
  const [form, setForm] = useState({ name: "", price: "", description: "" });
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    description?: string;
  }>({});

  useEffect(() => {
    let active = true;
    getSellerOrders()
      .then((data) => {
        if (!active) return;
        setOrders(data);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load orders");
      });
    return () => {
      active = false;
    };
  }, []);

  const totalOrders = orders?.length ?? null;
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, completed: 0, cancelled: 0 };
    for (const o of orders ?? []) {
      const k = o.status?.toLowerCase().trim();
      if (k === "pending" || k === "completed" || k === "cancelled") counts[k] += 1;
    }
    return counts;
  }, [orders]);
  // Earnings/commission are only populated by the DB trigger when status = 'completed'.
  // All money totals must therefore be derived from completed orders to stay consistent.
  const completedOrders = orders?.filter((o) => o.status === "completed") ?? [];
  const completedSales = completedOrders.reduce(
    (sum, o) => sum + Number(o.total_amount ?? 0),
    0,
  );
  const completedEarnings = completedOrders.reduce(
    (sum, o) => sum + Number(o.seller_earnings ?? 0),
    0,
  );
  const completedCommission = completedSales - completedEarnings;
  const pendingSales =
    orders
      ?.filter((o) => o.status === "pending")
      .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0) ?? 0;

  const sections = useMemo(
    () => [
      {
        title: "Net Earnings",
        value: orders === null ? "—" : `$${completedEarnings.toFixed(2)}`,
        icon: DollarSign,
        description: "After commission (completed)",
        tone: "bg-success/10 text-success",
      },
      {
        title: "Gross Sales",
        value: orders === null ? "—" : `$${completedSales.toFixed(2)}`,
        icon: TrendingUp,
        description: `${completedOrders.length} completed order${completedOrders.length !== 1 ? "s" : ""}`,
        tone: "bg-primary/10 text-primary",
      },
      {
        title: "Commission Paid",
        value: orders === null ? "—" : `$${completedCommission.toFixed(2)}`,
        icon: ShoppingCart,
        description: "Platform fees (5%)",
        tone: "bg-muted text-muted-foreground",
      },
      {
        title: "Pending Sales",
        value: orders === null ? "—" : `$${pendingSales.toFixed(2)}`,
        icon: Package,
        description: `${statusCounts.pending} pending order${statusCounts.pending !== 1 ? "s" : ""}`,
        tone: "bg-warning/10 text-warning",
      },
    ],
    [orders, completedSales, completedEarnings, completedCommission, completedOrders.length, pendingSales, statusCounts.pending],
  );

  const openEdit = (p: SubmittedProduct) => {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      description: p.description,
    });
    setErrors({});
  };

  const handleSave = () => {
    if (!editing) return;
    const parsed = editSchema.safeParse({
      name: form.name,
      price: Number(form.price),
      description: form.description,
    });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof errors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    updateProduct(editing.id, parsed.data);
    toast({
      title: "Product updated",
      description: `${parsed.data.name} has been saved.`,
    });
    setEditing(null);
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    removeProduct(deleting.id);
    toast({
      title: "Product deleted",
      description: `${deleting.name} has been removed.`,
    });
    setDeleting(null);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Seller Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            An overview of your earnings, orders, and products.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((s) => (
            <Card key={s.title} className="border-border/60 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.title}
                  </p>
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      s.tone,
                    )}
                  >
                    <s.icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
                  {s.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section>
          <Card>
            <CardHeader className="space-y-3 border-b border-border/60">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold">
                  Your orders
                </CardTitle>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                  {totalOrders ?? 0}
                </span>
              </div>
              {orders && orders.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(["pending", "completed", "cancelled"] as const).map((key) => {
                    const v = SELLER_STATUS_VISUALS[key];
                    const Icon = v.icon;
                    return (
                      <span
                        key={key}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                          v.className,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {v.label}
                        <span className="ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-background/60 px-1.5 text-[11px] font-semibold tabular-nums">
                          {statusCounts[key]}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {error ? (
                <p className="p-6 text-sm text-destructive">{error}</p>
              ) : orders === null ? (
                <p className="p-6 text-sm text-muted-foreground">Loading…</p>
              ) : orders.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-6 py-2.5 font-medium">Order</th>
                        <th className="px-6 py-2.5 font-medium">Status</th>
                        <th className="px-6 py-2.5 text-right font-medium">Sale</th>
                        <th className="px-6 py-2.5 text-right font-medium">Your earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {orders.map((o) => {
                        const earnings = Number(o.seller_earnings ?? 0);
                        const total = Number(o.total_amount ?? 0);
                        const isCompleted = o.status === "completed";
                        return (
                          <tr key={o.id} className="hover:bg-muted/30">
                            <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                              #{o.id.slice(0, 8)}
                            </td>
                            <td className="px-6 py-3">
                              <SellerStatusBadge status={o.status} />
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                              ${total.toFixed(2)}
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums">
                              {isCompleted ? (
                                <span className="font-semibold text-foreground">
                                  ${earnings.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">
                  Your products
                </CardTitle>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                  {products.length}
                </span>
              </div>
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/sell">
                  <Plus className="h-4 w-4" />
                  Add product
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {products.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  You haven't submitted any products yet.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {products.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-4 px-6 py-4"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary/60">
                        <SmartImage
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          fallbackClassName="h-full w-full flex items-center justify-center"
                          fallbackIcon={ImageIcon}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {p.name}
                          </p>
                          {p.featured && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                              <Star className="h-2.5 w-2.5 fill-current" />
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.status} · ₱{p.price.toLocaleString("en-US")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "gap-1.5",
                            p.featured &&
                              "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15 hover:text-warning",
                          )}
                          onClick={() => {
                            const next = !p.featured;
                            setFeatured(p.id, next);
                            toast({
                              title: next
                                ? "Marked as featured"
                                : "Removed from featured",
                              description: p.name,
                            });
                          }}
                          aria-pressed={!!p.featured}
                        >
                          <Star
                            className={cn(
                              "h-3.5 w-3.5",
                              p.featured && "fill-current",
                            )}
                          />
                          {p.featured ? "Featured" : "Feature"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
            <DialogDescription>
              Update the basic details for your listing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sd-edit-name">Name</Label>
              <Input
                id="sd-edit-name"
                value={form.name}
                maxLength={100}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sd-edit-price">Price (₱)</Label>
              <Input
                id="sd-edit-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
              {errors.price && (
                <p className="text-xs text-destructive">{errors.price}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sd-edit-description">Description</Label>
              <Textarea
                id="sd-edit-description"
                rows={4}
                maxLength={1000}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? (
                <>
                  <span className="font-semibold text-foreground">
                    {deleting.name}
                  </span>{" "}
                  will be permanently removed from your listings. This action
                  cannot be undone.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}


export default SellerDashboardPage;

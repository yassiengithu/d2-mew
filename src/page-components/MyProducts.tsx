import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Image as ImageIcon,
  PackagePlus,
  LogIn,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
} from "lucide-react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
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
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import SmartImage from "@/components/SmartImage";
import {
  useSubmittedProducts,
  type SubmittedProduct,
  type SubmittedProductStatus,
} from "@/context/SubmittedProductsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | SubmittedProductStatus;

const statusMeta: Record<
  SubmittedProductStatus,
  { label: string; pill: string; icon: typeof Clock }
> = {
  "Pending Approval": {
    label: "Pending",
    pill: "bg-warning/15 text-warning-foreground border-warning/40",
    icon: Clock,
  },
  Approved: {
    label: "Approved",
    pill: "bg-success/15 text-success border-success/40",
    icon: CheckCircle2,
  },
  Rejected: {
    label: "Rejected",
    pill: "bg-destructive/15 text-destructive border-destructive/40",
    icon: XCircle,
  },
};

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const editSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .finite("Price must be a number")
    .gt(0, "Price must be greater than 0")
    .max(10_000_000, "Price is too large"),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters")
    .max(1000, "Description must be less than 1000 characters"),
});

const MyProducts = () => {
  const { products, updateProduct, removeProduct } = useSubmittedProducts();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [editing, setEditing] = useState<SubmittedProduct | null>(null);
  const [deleting, setDeleting] = useState<SubmittedProduct | null>(null);
  const [form, setForm] = useState({ name: "", price: "", description: "" });
  const [errors, setErrors] = useState<{ name?: string; price?: string; description?: string }>({});
  const [filter, setFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => {
    const base = { all: products.length, "Pending Approval": 0, Approved: 0, Rejected: 0 };
    for (const p of products) base[p.status] += 1;
    return base;
  }, [products]);

  const filtered = useMemo(
    () => {
      const list = filter === "all" ? products : products.filter((p) => p.status === filter);
      // Featured products first, otherwise preserve existing order.
      return [...list].sort(
        (a, b) => Number(!!b.featured) - Number(!!a.featured),
      );
    },
    [products, filter],
  );

  useEffect(() => {
    document.title = "My Products";
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id } : null);
      setAuthChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const openEdit = (e: React.MouseEvent, product: SubmittedProduct) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(product);
    setForm({
      name: product.name,
      price: String(product.price),
      description: product.description,
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
    toast({ title: "Product updated", description: `${parsed.data.name} has been saved.` });
    setEditing(null);
  };

  const openDelete = (e: React.MouseEvent, product: SubmittedProduct) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(product);
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    removeProduct(deleting.id);
    toast({ title: "Product deleted", description: `${deleting.name} has been removed.` });
    setDeleting(null);
  };

  if (authChecked && !user) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="My Products" backTo="/profile" />
        <EmptyState
          className="pt-24"
          icon={LogIn}
          title="Please log in to continue"
          description="Sign in to see products linked to your seller account."
          action={
            <Button asChild className="rounded-xl h-11 px-8 text-sm font-bold">
              <Link to="/auth">Log in</Link>
            </Button>
          }
        />
        <BottomNav />
      </div>
    );
  }

  const filterChips: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "Pending Approval", label: "Pending", count: counts["Pending Approval"] },
    { id: "Approved", label: "Approved", count: counts.Approved },
    { id: "Rejected", label: "Rejected", count: counts.Rejected },
  ];

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-32">
      <PageHeader
        title="My Products"
        backTo="/profile"
        trailing={
          products.length > 0 ? (
            <span className="text-[11px] font-semibold text-primary-foreground bg-primary-foreground/15 px-2 py-1 rounded-full">
              {products.length}
            </span>
          ) : undefined
        }
      />

      {products.length === 0 ? (
        <div className="px-4 pt-4">
          <EmptyState
            className="pt-16"
            icon={PackagePlus}
            title="No products yet"
            description="Submit your first listing and it'll appear here for review and tracking."
            action={
              <Button asChild className="rounded-xl h-11 px-6 text-sm font-bold gap-2">
                <Link to="/sell">
                  <Plus className="h-4 w-4" />
                  Add your first product
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Status filter chips */}
          <div className="px-4 pt-4 pb-2 -mx-1">
            <div className="flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filterChips.map((chip) => {
                const active = filter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilter(chip.id)}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:text-foreground",
                    )}
                  >
                    {chip.label}
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="px-4 pt-1 space-y-2.5">
            {filtered.length === 0 ? (
              <EmptyState
                className="pt-12"
                icon={PackagePlus}
                title="Nothing here"
                description="No products match this filter yet."
              />
            ) : (
              filtered.map((p) => {
                const meta = statusMeta[p.status];
                const StatusIcon = meta.icon;
                return (
                  <Card
                    key={p.id}
                    className={cn(
                      "overflow-hidden shadow-sm hover:shadow-[var(--shadow-elevated)] transition-shadow",
                      p.featured && "border-warning/50 bg-warning/5",
                    )}
                  >
                    <Link
                      to={`/submission/${p.id}`}
                      className="flex gap-3 p-3 active:bg-secondary/40 transition-colors"
                    >
                      <div className="relative h-20 w-20 rounded-xl bg-secondary/60 overflow-hidden flex items-center justify-center shrink-0">
                        <SmartImage
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          fallbackClassName="h-full w-full flex items-center justify-center bg-secondary/60"
                          fallbackIcon={ImageIcon}
                        />
                        <span
                          className={cn(
                            "absolute top-1 left-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold backdrop-blur-sm",
                            meta.pill,
                          )}
                        >
                          <StatusIcon className="h-2.5 w-2.5" />
                          {meta.label}
                        </span>
                        {p.featured && (
                          <span
                            className="absolute top-1 right-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-warning text-warning-foreground shadow"
                            aria-label="Featured"
                          >
                            <Star className="h-3 w-3 fill-current" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div className="min-w-0">
                          <div className="flex items-start gap-1.5">
                            <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                              {p.name}
                            </p>
                            {p.featured && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-warning/15 text-warning px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                Featured
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {p.category} · {formatDate(p.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-base font-extrabold text-primary tabular-nums">
                            ₱{p.price.toLocaleString("en-US")}
                          </p>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </div>
                    </Link>
                    <div className="border-t border-border grid grid-cols-2">
                      <button
                        type="button"
                        onClick={(e) => openEdit(e, p)}
                        className="flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-foreground hover:bg-secondary/60 active:bg-secondary transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => openDelete(e, p)}
                        className="flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-destructive border-l border-border hover:bg-destructive/5 active:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Sticky add bar */}
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-3 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none z-10">
            <Button
              asChild
              className="w-full h-12 rounded-xl gap-2 text-sm font-bold shadow-[var(--shadow-elevated)] pointer-events-auto"
            >
              <Link to="/sell">
                <Plus className="h-4 w-4" />
                Add new product
              </Link>
            </Button>
          </div>
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
            <DialogDescription>Update the basic details for your listing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={form.name}
                maxLength={100}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-price">Price (₱)</Label>
              <Input
                id="edit-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={4}
                maxLength={1000}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? (
                <>
                  <span className="font-semibold text-foreground">{deleting.name}</span> will be
                  permanently removed from your listings. This action cannot be undone.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2">
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


      <BottomNav />
    </div>
  );
};

export default MyProducts;

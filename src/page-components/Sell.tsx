import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ImageIcon, PackagePlus, Clock, CheckCircle2, ExternalLink, Store, LogIn } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import { useSubmittedProducts } from "@/context/SubmittedProductsContext";
import { toast } from "@/hooks/use-toast";
import SmartImage from "@/components/SmartImage";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["Electronics", "Fashion", "Shoes", "Beauty", "Accessories", "Home"] as const;

const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required (min 2 characters)").max(100, "Max 100 characters"),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine((v) => !Number.isNaN(Number(v)) && Number.isFinite(Number(v)), {
      message: "Price must be a valid number",
    })
    .transform((v) => Number(v))
    .pipe(
      z
        .number()
        .positive("Price must be greater than 0")
        .max(1_000_000, "Price too high"),
    ),
  description: z.string().trim().min(10, "Description is required (min 10 characters)").max(1000, "Max 1000 characters"),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Category is required" }) }),
  imageUrl: z
    .string()
    .trim()
    .min(1, "Product image URL is required")
    .max(500, "URL too long")
    .url("Enter a valid image URL"),
  externalUrl: z
    .string()
    .trim()
    .max(500, "URL too long")
    .url("Enter a valid URL (must start with http:// or https://)")
    .or(z.literal(""))
    .optional(),
});

type FormErrors = Partial<Record<keyof z.infer<typeof productSchema>, string>>;

const Sell = () => {
  const navigate = useNavigate();
  const { addProduct, products } = useSubmittedProducts();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [sellerName, setSellerName] = useState<string>("");

  useEffect(() => {
    let active = true;
    const loadProfileName = async (uid: string, email?: string | null) => {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", uid)
        .maybeSingle();
      if (!active) return;
      const fromProfile = (data?.name ?? "").trim();
      const fallback = email?.split("@")[0] ?? "Seller";
      setSellerName(fromProfile.length >= 2 ? fromProfile : fallback);
    };
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const u = data.user;
      setUser(u ? { id: u.id, email: u.email } : null);
      setAuthChecked(true);
      if (u) loadProfileName(u.id, u.email);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email } : null);
      setAuthChecked(true);
      if (u) loadProfileName(u.id, u.email);
      else setSellerName("");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const resetForm = () => {
    setName("");
    setPrice("");
    setDescription("");
    setCategory("");
    setImageUrl("");
    setExternalUrl("");
    setErrors({});
    setSubmittedName(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!user) {
      toast({ title: "Please log in to submit a product", variant: "destructive" });
      return;
    }

    const parsed = productSchema.safeParse({
      name,
      price,
      description,
      category,
      imageUrl: imageUrl.trim(),
      externalUrl: externalUrl.trim(),
    });

    if (!parsed.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    addProduct({
      name: parsed.data.name,
      price: parsed.data.price,
      description: parsed.data.description,
      category: parsed.data.category,
      sellerName: sellerName || (user.email?.split("@")[0] ?? "Seller"),
      imageUrl: parsed.data.imageUrl,
      externalUrl: parsed.data.externalUrl || undefined,
    });
    toast({
      title: "Product submitted",
      description: "Your product is now Pending Approval.",
    });
    setSubmittedName(parsed.data.name);
    setSubmitting(false);
    // Scroll to top so the confirmation is the first thing the user sees
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showPreview = imageUrl.trim().length > 0 && !errors.imageUrl;

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-40">
      {/* Header */}
      <header
        className="px-4 pt-10 pb-6 rounded-b-3xl"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Link
            to="/profile"
            aria-label="Back to profile"
            className="h-10 w-10 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 active:bg-primary-foreground/30 flex items-center justify-center text-primary-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-primary-foreground text-lg font-bold">Sell a Product</h1>
        </div>
        <p className="text-primary-foreground/80 text-[13px] leading-snug">
          Submit your product details. New listings start as{" "}
          <strong>Pending Approval</strong>.
        </p>
      </header>

      <main className="px-4 -mt-3">
        {authChecked && !user ? (
          <Card className="p-6 shadow-card text-center space-y-4">
            <div className="h-14 w-14 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
              <LogIn className="h-7 w-7 text-primary" aria-hidden />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">Log in to sell</h2>
              <p className="text-sm text-muted-foreground">
                Submissions are linked to your seller account.
              </p>
            </div>
            <Button asChild className="h-11 rounded-xl text-sm font-semibold w-full">
              <Link to="/auth">Log in or create account</Link>
            </Button>
          </Card>
        ) : submittedName ? (
          <Card
            className="p-5 shadow-card border-success/40 bg-success/5"
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground">
                  Submission received
                </h2>
                <p className="text-sm text-foreground leading-relaxed">
                  Your product has been submitted and is pending approval.
                </p>
                <p className="text-xs text-muted-foreground pt-1 truncate max-w-full">
                  <span className="font-semibold text-foreground">
                    {submittedName}
                  </span>{" "}
                  · Pending Approval
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <Button
                  variant="outline"
                  className="h-11 rounded-xl text-sm font-semibold"
                  onClick={resetForm}
                >
                  Submit another
                </Button>
                <Button
                  className="h-11 rounded-xl text-sm font-semibold"
                  onClick={() => navigate("/profile")}
                >
                  Done
                </Button>
              </div>
            </div>
          </Card>
        ) : (
        <Card className="p-4 shadow-card">
          <form id="sell-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Image preview + URL */}
            <div className="space-y-2 scroll-mt-20">
              <Label htmlFor="imageUrl" className="text-sm font-semibold">
                Product Image
              </Label>
              <div className="aspect-video w-full rounded-xl bg-secondary/60 border border-border overflow-hidden flex items-center justify-center">
                {showPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                    onError={() =>
                      setErrors((e) => ({ ...e, imageUrl: "Image failed to load" }))
                    }
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-1" aria-hidden />
                    <span className="text-xs">Image preview</span>
                  </div>
                )}
              </div>
              <Input
                id="imageUrl"
                type="url"
                inputMode="url"
                placeholder="https://example.com/photo.jpg"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  if (errors.imageUrl)
                    setErrors((prev) => ({ ...prev, imageUrl: undefined }));
                }}
                aria-invalid={!!errors.imageUrl}
                aria-describedby={errors.imageUrl ? "imageUrl-error" : undefined}
                maxLength={500}
                required
                className="h-12 rounded-xl text-base"
              />
              {errors.imageUrl && (
                <p id="imageUrl-error" className="text-xs text-destructive">
                  {errors.imageUrl}
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5 scroll-mt-20">
              <Label htmlFor="name" className="text-sm font-semibold">
                Product Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wireless Earbuds Pro"
                aria-invalid={!!errors.name}
                maxLength={100}
                required
                autoComplete="off"
                className="h-12 rounded-xl text-base"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Price + Category (paired row) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 scroll-mt-20">
                <Label htmlFor="price" className="text-sm font-semibold">
                  Price (₱)
                </Label>
                <Input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  aria-invalid={!!errors.price}
                  required
                  className="h-12 rounded-xl text-base"
                />
                {errors.price && (
                  <p className="text-xs text-destructive">{errors.price}</p>
                )}
              </div>

              <div className="space-y-1.5 scroll-mt-20">
                <Label htmlFor="category" className="text-sm font-semibold">
                  Category
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger
                    id="category"
                    aria-invalid={!!errors.category}
                    className="h-12 rounded-xl text-base"
                  >
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="py-3 text-base">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-xs text-destructive">{errors.category}</p>
                )}
              </div>
            </div>

            {/* Seller account (auto from logged-in user) */}
            <div className="space-y-1.5 scroll-mt-20">
              <Label className="text-sm font-semibold">Seller Account</Label>
              <div className="flex items-center gap-3 h-12 rounded-xl border border-border bg-secondary/50 px-3">
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                  <Store className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {sellerName || "Your account"}
                  </p>
                  {user?.email && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Listings are linked to your account. Update your name in your profile to change how it's shown.
              </p>
            </div>

            {/* External Product Link (optional) */}
            <div className="space-y-1.5 scroll-mt-20">
              <Label
                htmlFor="externalUrl"
                className="text-sm font-semibold flex items-center gap-1.5"
              >
                External Product Link
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Optional
                </span>
              </Label>
              <div className="relative">
                <ExternalLink
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                  aria-hidden
                />
                <Input
                  id="externalUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://shopee.ph/... or https://lazada.com.ph/..."
                  value={externalUrl}
                  onChange={(e) => {
                    setExternalUrl(e.target.value);
                    if (errors.externalUrl)
                      setErrors((prev) => ({ ...prev, externalUrl: undefined }));
                  }}
                  aria-invalid={!!errors.externalUrl}
                  aria-describedby={
                    errors.externalUrl ? "externalUrl-error" : "externalUrl-hint"
                  }
                  maxLength={500}
                  autoComplete="off"
                  className="h-12 rounded-xl text-base pl-9"
                />
              </div>
              {errors.externalUrl ? (
                <p id="externalUrl-error" className="text-xs text-destructive">
                  {errors.externalUrl}
                </p>
              ) : (
                <p id="externalUrl-hint" className="text-[11px] text-muted-foreground">
                  Link to your listing on Shopee, Lazada, TikTok Shop, etc.
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5 scroll-mt-20">
              <Label htmlFor="description" className="text-sm font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell buyers what makes this product special..."
                rows={5}
                maxLength={1000}
                aria-invalid={!!errors.description}
                required
                className="rounded-xl text-base leading-relaxed resize-none"
              />
              <div className="flex justify-between items-center">
                {errors.description ? (
                  <p className="text-xs text-destructive">{errors.description}</p>
                ) : (
                  <span />
                )}
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {description.length}/1000
                </span>
              </div>
            </div>

            {/* Status hint */}
            <div
              className="flex items-start gap-2 rounded-xl bg-warning/15 border border-warning/40 p-3"
              role="note"
            >
              <Clock
                className="h-4 w-4 text-warning shrink-0 mt-0.5"
                aria-hidden
              />
              <p className="text-xs text-foreground leading-relaxed">
                Default status: <strong>Pending Approval</strong>. An admin will
                review your listing before it goes live.
              </p>
            </div>
          </form>
        </Card>
        )}


        {/* Recent submissions */}
        <section className="mt-6 space-y-2">
          <h2 className="text-sm font-bold text-foreground px-1">
            Your Submissions
          </h2>
          {products.length === 0 ? (
            <Card className="p-5 flex flex-col items-center text-center gap-2">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <PackagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-foreground">No submissions yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Fill in the form above to submit your first product. It'll appear here once submitted.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {products.slice(0, 5).map((p) => (
                <Link key={p.id} to={`/submission/${p.id}`} className="block active:opacity-80 transition-opacity">
                  <Card className="p-3 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-secondary/60 overflow-hidden flex items-center justify-center shrink-0">
                      <SmartImage
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        fallbackClassName="h-full w-full flex items-center justify-center bg-secondary/60"
                        fallbackIcon={ImageIcon}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₱{p.price.toLocaleString("en-US")} · {p.category}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-warning/15 border-warning/40 text-warning-foreground text-[10px]"
                    >
                      {p.status}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Sticky submit CTA — keeps the action reachable on long forms */}
      {!submittedName && (
        <div className="fixed bottom-[52px] left-0 right-0 max-w-md mx-auto bg-card/95 backdrop-blur border-t border-border px-4 py-3 z-40">
          <Button
            type="submit"
            form="sell-form"
            className="w-full h-12 rounded-xl gap-2 text-sm font-bold"
            disabled={submitting}
          >
            <PackagePlus className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Sell;

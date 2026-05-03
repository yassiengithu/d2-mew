import { useEffect, useMemo, useRef, useState } from "react";
import { Star, ShoppingCart, Flame, TrendingUp, Search, X, Heart, PackageSearch, ExternalLink, ImageIcon, Sparkles, Store, SlidersHorizontal, ArrowUpDown, Check } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { products, type ProductSource, type Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useSubmittedProducts } from "@/context/SubmittedProductsContext";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import SourceBadge from "@/components/SourceBadge";
import EmptyState from "@/components/EmptyState";
import SmartImage from "@/components/SmartImage";
import { useWishlist } from "@/context/WishlistContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";

const sources: (ProductSource | "All")[] = ["All", "Shopee", "Temu", "Amazon"];

type SortOption = "default" | "price-asc" | "price-desc";
const sortOptions: { value: SortOption; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

const getDiscount = (p: Product) => Math.round((1 - p.price / p.oldPrice) * 100);
const isPopular = (p: Product) => parseFloat(p.sold.replace("k", "000").replace(".", "")) >= 1000 || p.reviews >= 200;

const Products = () => {
  const [activeSource, setActiveSource] = useState<ProductSource | "All">("All");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const { products: submitted } = useSubmittedProducts();

  // Debounce search input for smoother filtering on large lists
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const normalizedSearchQuery = debouncedQuery.trim().toLowerCase();

  // Approved submissions only — hide Pending Approval / Rejected
  const approvedSubmissions = useMemo(
    () => submitted.filter((s) => s.status === "Approved"),
    [submitted],
  );

  // Categories available within the current source filter (avoids dead-end selections
  // like picking a submission-only category while filtering by a specific marketplace).
  const categories = useMemo(() => {
    const productCats = products
      .filter((p) => activeSource === "All" || p.source === activeSource)
      .map((p) => p.category);
    // Approved submissions have no source — only contribute when source is "All"
    const submissionCats = activeSource === "All" ? approvedSubmissions.map((s) => s.category) : [];
    return ["All", ...new Set([...productCats, ...submissionCats])];
  }, [approvedSubmissions, activeSource]);

  // If the active category disappears after a source change, reset it to "All"
  useEffect(() => {
    if (activeCategory !== "All" && !categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [categories, activeCategory]);

  const filteredProducts = useMemo(
    () => {
      const list = products
        .filter((p) => activeSource === "All" || p.source === activeSource)
        .filter((p) => activeCategory === "All" || p.category === activeCategory)
        .filter((p) => p.name.toLowerCase().includes(normalizedSearchQuery));
      // When sorting is active, the merged grid handles ordering — return unsorted here.
      return list;
    },
    [activeSource, activeCategory, normalizedSearchQuery],
  );

  // Submissions don't have a source — only show them when source filter is "All"
  const filteredSubmissions = useMemo(
    () => {
      const list = approvedSubmissions
        .filter(() => activeSource === "All")
        .filter((s) => activeCategory === "All" || s.category === activeCategory)
        .filter((s) => s.name.toLowerCase().includes(normalizedSearchQuery));
      return list;
    },
    [approvedSubmissions, activeSource, activeCategory, normalizedSearchQuery],
  );

  // When a sort is active, submissions and products must be ordered together
  // so the price sequence is correct across the full grid.
  const isSorted = sortBy !== "default";
  const mergedSorted = useMemo(() => {
    if (!isSorted) return [] as Array<{ kind: "product"; item: typeof filteredProducts[number] } | { kind: "submission"; item: typeof filteredSubmissions[number] }>;
    const merged: Array<{ kind: "product"; item: typeof filteredProducts[number]; price: number } | { kind: "submission"; item: typeof filteredSubmissions[number]; price: number }> = [
      ...filteredProducts.map((p) => ({ kind: "product" as const, item: p, price: p.price })),
      ...filteredSubmissions.map((s) => ({ kind: "submission" as const, item: s, price: s.price })),
    ];
    merged.sort((a, b) => (sortBy === "price-asc" ? a.price - b.price : b.price - a.price));
    return merged.map(({ kind, item }) => (kind === "product" ? { kind, item } : { kind, item }));
  }, [isSorted, sortBy, filteredProducts, filteredSubmissions]);

  const totalCount = filteredProducts.length + filteredSubmissions.length;

  // Incremental rendering — render in batches as user scrolls for fast initial paint
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset visible window when the result set changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeSource, activeCategory, normalizedSearchQuery, sortBy]);

  useEffect(() => {
    if (visibleCount >= totalCount) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, totalCount));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleCount, totalCount]);

  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();


  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      {/* Header */}
      <PageHeader
        title="Shop All Products"
        backTo="/"
        trailing={
          <span className="text-[11px] font-semibold text-primary-foreground bg-primary-foreground/15 px-2 py-1 rounded-full">
            {totalCount} {totalCount === 1 ? "item" : "items"}
          </span>
        }
      />

      {/* Search Bar */}
      <div className="sticky top-[60px] z-40 bg-background px-4 pt-3 pb-2">
        <div className="flex h-11 items-center gap-2.5 rounded-full border border-border bg-card px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products by name"
            className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary active:scale-95 transition-transform"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Compact Filter Toolbar */}
      <div className="sticky top-[116px] z-30 bg-background px-4 py-2 flex items-center gap-2 border-b border-border">
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                activeSource !== "All" || activeCategory !== "All"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {(activeSource !== "All" ? 1 : 0) + (activeCategory !== "All" ? 1 : 0) > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {(activeSource !== "All" ? 1 : 0) + (activeCategory !== "All" ? 1 : 0)}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Source</p>
                <div className="flex flex-wrap gap-2">
                  {sources.map((s) => (
                    <button
                      key={s}
                      onClick={() => setActiveSource(s)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                        activeSource === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {activeSource === s && <Check className="h-3 w-3" />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setActiveCategory(c)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                        activeCategory === c
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {activeCategory === c && <Check className="h-3 w-3" />}
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <SheetFooter className="mt-6 flex-row gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setActiveSource("All");
                  setActiveCategory("All");
                }}
              >
                Reset
              </Button>
              <SheetClose asChild>
                <Button className="flex-1">Show {totalCount} results</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                sortBy !== "default"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground"
              }`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortBy === "default" ? "Sort" : sortOptions.find((o) => o.value === sortBy)?.label}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="text-left">
              <SheetTitle>Sort by</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-1">
              {sortOptions.map((opt) => (
                <SheetClose asChild key={opt.value}>
                  <button
                    onClick={() => setSortBy(opt.value)}
                    className={`flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${
                      sortBy === opt.value
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {opt.label}
                    {sortBy === opt.value && <Check className="h-4 w-4" />}
                  </button>
                </SheetClose>
              ))}
            </div>
          </SheetContent>
        </Sheet>

      </div>

      {/* Active Filters */}
      {(activeSource !== "All" ||
        activeCategory !== "All" ||
        sortBy !== "default" ||
        normalizedSearchQuery !== "") && (
        <div className="px-4 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground mr-0.5">
              Active:
            </span>
            {normalizedSearchQuery !== "" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">
                Search: “{debouncedQuery.trim()}”
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Remove search filter"
                  className="-mr-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {activeSource !== "All" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">
                Source: {activeSource}
                <button
                  type="button"
                  onClick={() => setActiveSource("All")}
                  aria-label="Remove source filter"
                  className="-mr-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {activeCategory !== "All" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent-foreground px-2.5 py-1 text-[11px] font-semibold">
                Category: {activeCategory}
                <button
                  type="button"
                  onClick={() => setActiveCategory("All")}
                  aria-label="Remove category filter"
                  className="-mr-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/30"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {sortBy !== "default" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">
                {sortOptions.find((o) => o.value === sortBy)?.label}
                <button
                  type="button"
                  onClick={() => setSortBy("default")}
                  aria-label="Remove sort"
                  className="-mr-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveSource("All");
                setActiveCategory("All");
                setSortBy("default");
              }}
              className="ml-auto text-[11px] font-semibold text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {totalCount === 0 ? (
        <EmptyState
          className="pt-16 pb-24"
          icon={PackageSearch}
          title="No products found"
          action={
            <Button
              variant="outline"
              className="rounded-xl h-11 px-6 text-sm font-bold"
              onClick={() => {
                setSearchQuery("");
                setActiveSource("All");
                setActiveCategory("All");
                setSortBy("default");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
      <div className="p-4 pb-20 grid grid-cols-2 gap-2.5">
        {(() => {
          const renderSubmission = (s: typeof filteredSubmissions[number], i: number) => (
            <Link
              to={`/submission/${s.id}`}
              key={`sub-${s.id}`}
              className="contain-card rounded-xl bg-card shadow-card overflow-hidden flex flex-col active:scale-[0.98] transition-transform"
            >
              <div className="relative bg-secondary flex items-center justify-center h-36 overflow-hidden">
                <SmartImage
                  src={s.imageUrl}
                  alt={s.name}
                  className="h-full w-full object-cover"
                  fallbackClassName="h-full w-full flex items-center justify-center bg-secondary"
                />
                <span className="absolute top-2 left-2 flex items-center gap-0.5 rounded-md bg-success px-1.5 py-0.5 text-[9px] font-bold text-success-foreground shadow-sm">
                  <Sparkles className="h-2.5 w-2.5" />
                  NEW
                </span>
                {s.externalUrl && (
                  <span
                    className="absolute top-2 right-2 rounded-full bg-card/90 p-1 shadow-sm"
                    aria-label="Has external listing link"
                    title="External listing available"
                  >
                    <ExternalLink className="h-3 w-3 text-foreground" />
                  </span>
                )}
              </div>
              <div className="p-2.5 flex flex-col flex-1">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
                  {s.category}
                </span>
                <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-snug mt-0.5">
                  {s.name}
                </p>
                <div className="flex items-center gap-1 mt-1 min-w-0">
                  <Store className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-muted-foreground truncate">
                    {s.sellerName}
                  </span>
                </div>
                <div className="mt-auto pt-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">₱{s.price.toLocaleString("en-US")}</span>
                  <Button
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onClick={(e) => {
                      e.preventDefault();
                      toast({
                        title: "Coming soon",
                        description: "Buying community-listed products is not yet available.",
                      });
                    }}
                    aria-label={`Add ${s.name} to cart`}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Link>
          );

          const renderProduct = (p: typeof filteredProducts[number], i: number) => {
            const discount = getDiscount(p);
            const popular = isPopular(p);
            return (
              <Link
                to={`/product/${p.id}`}
                key={`prod-${p.id}`}
                className="contain-card rounded-xl bg-card shadow-card overflow-hidden flex flex-col active:scale-[0.98] transition-transform"
              >
                <div className="relative bg-secondary flex items-center justify-center h-36 text-5xl">
                  {p.img}
                  {/* Wishlist heart */}
                  <button
                    className="absolute top-2 right-2 rounded-full bg-card/80 p-1.5 z-10"
                    onClick={(e) => { e.preventDefault(); toggleWishlist(p.id); }}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isWishlisted(p.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                  </button>
                  <SourceBadge source={p.source} className="absolute bottom-2 left-2" />
                  {/* Discount badge */}
                  {discount >= 20 && (
                    <span className="absolute top-2 left-2 flex items-center gap-0.5 rounded-md bg-sale px-1.5 py-0.5 text-[9px] font-bold text-sale-foreground shadow-sm">
                      <Flame className="h-2.5 w-2.5" />
                      {discount}% OFF
                    </span>
                  )}
                  {/* Popular badge — sits below the wishlist heart so it never gets clipped */}
                  {popular && (
                    <span className="absolute top-10 right-2 flex items-center gap-0.5 rounded-md bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground shadow-sm">
                      <TrendingUp className="h-2.5 w-2.5" />
                      Popular
                    </span>
                  )}
                </div>
                <div className="p-2.5 flex flex-col flex-1">
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
                    {p.category}
                  </span>
                  <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-snug mt-0.5">
                    {p.name}
                  </p>
                  <button
                    onClick={(e) => { e.preventDefault(); navigate(`/shop/${encodeURIComponent(p.seller.name)}`); }}
                    className="flex items-center gap-1 mt-1 text-left group/seller min-w-0"
                  >
                    <span className="text-[11px] leading-none shrink-0">{p.seller.logo}</span>
                    <span className="text-[10px] text-muted-foreground truncate group-hover/seller:text-primary transition-colors">
                      {p.seller.name}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star className="h-3 w-3 fill-star text-star" />
                    <span className="text-[10px] font-medium text-foreground">{p.rating}</span>
                    <span className="text-[10px] text-muted-foreground">({p.reviews})</span>
                  </div>
                  <div className="mt-auto pt-1.5 flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-primary">₱{p.price.toLocaleString("en-US")}</span>
                      <span className="text-[9px] text-muted-foreground line-through">₱{p.oldPrice.toLocaleString("en-US")}</span>
                    </div>
                    <Button
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={(e) => { e.preventDefault(); handleAddToCart(p); }}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Link>
            );
          };

          if (isSorted) {
            return mergedSorted.slice(0, visibleCount).map((entry, i) =>
              entry.kind === "submission"
                ? renderSubmission(entry.item, i)
                : renderProduct(entry.item, i),
            );
          }

          const subsShown = filteredSubmissions.slice(0, visibleCount);
          const productsShown = filteredProducts.slice(0, Math.max(0, visibleCount - subsShown.length));
          return (
            <>
              {subsShown.map((s, i) => renderSubmission(s, i))}
              {productsShown.map((p, i) => renderProduct(p, i))}
            </>
          );
        })()}
        {visibleCount < totalCount && (
          <div ref={sentinelRef} className="col-span-2 h-10" aria-hidden />
        )}
      </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Products;

import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Star, ShoppingCart, Heart, Share2, Minus, Plus, MapPin, ShieldCheck, Globe, ExternalLink, MessageCircle, MessageSquare } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { products } from "@/data/products";
import { useEffect, useState } from "react";
import { trackProductView } from "@/lib/analytics";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRatings } from "@/context/RatingsContext";
import { useOrders } from "@/context/OrdersContext";
import StarRating from "@/components/StarRating";
import BottomActionBar from "@/components/BottomActionBar";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import SourceBadge from "@/components/SourceBadge";
import PageTransition from "@/components/PageTransition";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const {
    getRatingSummary,
    getUserRating,
    rateProduct,
    rateProductDetailed,
    isAuthenticated,
    getRatingsForProduct,
    getReviewerName,
    currentUserId,
  } = useRatings();
  const { orders } = useOrders();
  const [qty, setQty] = useState(1);
  const [reviewDraft, setReviewDraft] = useState<string | null>(null);

  const product = products.find((p) => p.id === Number(id));

  useEffect(() => {
    if (product) trackProductView(product.id);
  }, [product?.id]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="Product not found" />
        <div className="flex flex-col items-center justify-center gap-4 pt-24 px-8 text-center animate-fade-in">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
            <ShoppingCart className="h-9 w-9 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">This product is unavailable</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            It may have been removed or the link is invalid. Try browsing our latest products.
          </p>
          <Button asChild className="rounded-xl h-11 px-8 text-sm font-bold mt-2">
            <Link to="/products">Browse Products</Link>
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const discount = Math.round((1 - product.price / product.oldPrice) * 100);

  const handleAddToCart = () => {
    addToCart(product, qty);
    toast({
      title: "Added to cart!",
      description: `${qty}x ${product.name} added to your cart.`,
    });
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-40">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="h-9 w-9 rounded-full bg-card/90 flex items-center justify-center shadow-sm"
        >
          <ChevronLeft className="h-4 w-4 text-foreground" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const wasFavorited = isWishlisted(product.id);
              toggleWishlist(product.id);
              toast({
                title: wasFavorited ? "Removed from favorites" : "Added to favorites",
                description: product.name,
              });
            }}
            aria-label={isWishlisted(product.id) ? "Remove from favorites" : "Add to favorites"}
            className="h-9 w-9 rounded-full bg-card/90 flex items-center justify-center shadow-sm"
          >
            <Heart className={`h-4 w-4 ${isWishlisted(product.id) ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
          <button className="h-9 w-9 rounded-full bg-card/90 flex items-center justify-center shadow-sm">
            <Share2 className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </header>

      {/* Product Image */}
      <div className="bg-secondary flex items-center justify-center h-80 text-8xl relative">
        {product.img}
        {discount > 0 && (
          <span className="absolute bottom-3 left-3 rounded-lg bg-sale px-2 py-1 text-xs font-bold text-sale-foreground">
            {discount}% OFF
          </span>
        )}
      </div>

      {/* Details */}
      <div className="px-4 pt-4 space-y-4">
        {/* Category */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {product.category}
          </span>
          <SourceBadge source={product.source} />
        </div>

        {/* Name */}
        <h1 className="text-lg font-bold text-foreground leading-snug">{product.name}</h1>

        {/* Rating & Sold */}
        {(() => {
          const summary = getRatingSummary(product.id);
          // Blend seed (catalog) rating with user-submitted ratings.
          const totalCount = product.reviews + summary.count;
          const blendedAvg =
            totalCount > 0
              ? (product.rating * product.reviews + summary.average * summary.count) / totalCount
              : product.rating;
          return (
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground tabular-nums leading-none">
                  {blendedAvg.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/ 5</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <StarRating size="sm" value={Math.round(blendedAvg)} readOnly />
                <span className="text-[10px] text-muted-foreground">
                  {totalCount} {totalCount === 1 ? "review" : "reviews"} · {product.sold} sold
                </span>
              </div>
            </div>
          );
        })()}

        {/* User rating block — only after a completed order containing this product */}
        {(() => {
          const userRating = getUserRating(product.id);
          const hasCompletedPurchase = orders.some(
            (o) => o.status === "completed" && o.items.some((i) => i.id === product.id),
          );
          if (!hasCompletedPurchase && !userRating) return null;
          const savedReview = userRating?.review ?? "";
          const draft = reviewDraft ?? savedReview;
          const canWriteReview = isAuthenticated && !!userRating;
          const dirty = draft.trim() !== savedReview.trim();
          return (
            <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-4 space-y-3 shadow-sm">
              <div className="flex flex-col items-center text-center gap-2">
                <p className="text-sm font-bold text-foreground">
                  {userRating ? "Your rating" : "Rate this product"}
                </p>
                <p className="text-[11px] text-muted-foreground -mt-1">
                  {isAuthenticated
                    ? userRating
                      ? "Tap a star to update"
                      : "You bought this — share your rating"
                    : "Sign in to rate"}
                </p>
                <StarRating
                  size="xl"
                  value={userRating?.stars ?? 0}
                  readOnly={!isAuthenticated}
                  onChange={(stars) => {
                    const ok = rateProduct(product.id, stars);
                    if (ok) {
                      toast({
                        title: userRating ? "Rating updated" : "Thanks for your rating!",
                        description: `${stars} of 5 stars`,
                      });
                    } else {
                      toast({
                        title: "Can't submit rating",
                        description: isAuthenticated
                          ? "Only verified buyers can rate this product."
                          : "Please sign in to rate this product.",
                        variant: "destructive",
                      });
                    }
                  }}
                />
              </div>
              {canWriteReview && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">
                      {savedReview ? "Your review" : "Write a review (optional)"}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {draft.length}/500
                    </p>
                  </div>
                  <Textarea
                    value={draft}
                    onChange={(e) => setReviewDraft(e.target.value.slice(0, 500))}
                    placeholder="Share your experience with this product…"
                    rows={3}
                    className="text-xs resize-none rounded-xl bg-background"
                  />
                  <div className="flex items-center justify-end gap-2">
                    {dirty && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-xl text-xs"
                        onClick={() => setReviewDraft(null)}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 rounded-xl text-xs font-bold px-4"
                      disabled={!dirty}
                      onClick={() => {
                        const result = rateProductDetailed(product.id, userRating!.stars, draft);
                        if (result === "created" || result === "updated") {
                          setReviewDraft(null);
                          toast({
                            title: draft.trim().length > 0 ? "Review saved" : "Review cleared",
                            description: product.name,
                          });
                        } else if (result === "duplicate") {
                          toast({
                            title: "Already submitted",
                            description: "You've already left this exact review for this product.",
                            variant: "destructive",
                          });
                        } else {
                          toast({
                            title: "Can't save review",
                            description: "Only verified buyers can review this product.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      {savedReview ? "Save changes" : "Post review"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">₱{product.price.toLocaleString("en-US")}</span>
          {product.oldPrice > product.price && (
            <span className="text-sm text-muted-foreground line-through">₱{product.oldPrice.toLocaleString("en-US")}</span>
          )}
        </div>

        {/* Add to Favorites */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 rounded-xl text-sm font-semibold gap-2"
          onClick={() => {
            const wasFavorited = isWishlisted(product.id);
            toggleWishlist(product.id);
            toast({
              title: wasFavorited ? "Removed from favorites" : "Added to favorites",
              description: product.name,
            });
          }}
        >
          <Heart
            className={`h-4 w-4 ${
              isWishlisted(product.id) ? "fill-destructive text-destructive" : ""
            }`}
          />
          {isWishlisted(product.id) ? "Saved to Favorites" : "Add to Favorites"}
        </Button>

        {/* Source / Sourced From card */}
        {(() => {
          const sourceMeta: Record<typeof product.source, { tagline: string; tile: string; trust: string; searchUrl: string }> = {
            Shopee: {
              tagline: "Imported from Shopee Marketplace",
              tile: "bg-source-shopee/15 text-source-shopee",
              trust: "Backed by Shopee Guarantee",
              searchUrl: "https://shopee.ph/search?keyword=",
            },
            Temu: {
              tagline: "Imported from Temu Marketplace",
              tile: "bg-source-temu/15 text-source-temu",
              trust: "Purchase Protection included",
              searchUrl: "https://www.temu.com/search_result.html?search_key=",
            },
            Amazon: {
              tagline: "Imported from Amazon Marketplace",
              tile: "bg-source-amazon/15 text-source-amazon",
              trust: "A-to-z Guarantee Protection",
              searchUrl: "https://www.amazon.com/s?k=",
            },
          };
          const meta = sourceMeta[product.source];
          const externalUrl = product.affiliateUrl ?? `${meta.searchUrl}${encodeURIComponent(product.name)}`;
          return (
            <div className="rounded-xl border border-border bg-card shadow-card p-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${meta.tile}`}>
                  <Globe className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-foreground">Sourced from</p>
                    <SourceBadge source={product.source} />
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{meta.tagline}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ShieldCheck className="h-3 w-3 text-success shrink-0" />
                    <span className="text-[10px] font-medium text-success">{meta.trust}</span>
                  </div>
                </div>
              </div>
              <p className="rounded-lg bg-secondary px-3 py-2 text-[10px] font-medium text-muted-foreground">
                This app may redirect to external platforms
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg text-xs font-semibold gap-1.5 px-2"
                  onClick={() => window.open(externalUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Affiliate deal
                </Button>
                <Button
                  size="sm"
                  className="h-9 rounded-lg text-xs font-semibold gap-1.5 px-2"
                  onClick={() => window.open(externalUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Source app
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Description */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-1.5">Description</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{product.description}</p>
        </div>

        {/* Reviews */}
        {(() => {
          const ratings = getRatingsForProduct(product.id)
            .slice()
            .sort((a, b) => (a.ratedAt < b.ratedAt ? 1 : -1));
          if (ratings.length === 0) {
            return (
              <div>
                <h2 className="text-sm font-bold text-foreground mb-3">
                  Customer reviews
                </h2>
                <div className="rounded-2xl border border-border bg-card py-8">
                  <EmptyState
                    icon={MessageSquare}
                    title="No reviews yet"
                    description="Be the first to share your experience with this product."
                  />
                </div>
              </div>
            );
          }
          const summary = getRatingSummary(product.id);
          return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground">
                  Customer reviews
                </h2>
                <div className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
                  <Star className="h-3 w-3 fill-star text-star" />
                  <span className="text-[11px] font-bold text-foreground tabular-nums">
                    {summary.average.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({ratings.length})
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {ratings.map((r) => {
                  const isYou = r.userId === currentUserId;
                  const name = isYou ? "You" : getReviewerName(r.userId);
                  const initial = (name[0] || "?").toUpperCase();
                  const date = new Date(r.ratedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <div
                      key={`${r.productId}-${r.userId}`}
                      className="rounded-2xl border border-border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {name}
                            </p>
                            {isYou && (
                              <span className="text-[9px] font-bold uppercase tracking-wide rounded-full bg-primary/10 text-primary px-1.5 py-0.5">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <StarRating size="sm" value={r.stars} readOnly />
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">{date}</span>
                          </div>
                        </div>
                      </div>
                      {r.review && (
                        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap break-words pl-[42px]">
                          {r.review}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Seller */}
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg">
            {product.seller.logo}
          </div>
          <div className="flex-1 min-w-0">
            <Link to={`/shop/${encodeURIComponent(product.seller.name)}`} className="text-xs font-semibold text-primary hover:underline">{product.seller.name}</Link>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-star text-star" />
                <span className="text-[10px] font-medium text-foreground">{product.seller.rating}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">•</span>
              <div className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{product.seller.location}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-[10px] h-7 px-2.5 gap-1"
              onClick={() => navigate(`/messages/${product.id}`)}
              aria-label={`Message ${product.seller.name}`}
            >
              <MessageCircle className="h-3 w-3" />
              Message
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg text-[10px] h-7 px-3" onClick={() => navigate(`/shop/${encodeURIComponent(product.seller.name)}`)}>
              Visit Shop
            </Button>
          </div>
        </div>

        {/* Related Products */}
        {(() => {
          const related = products
            .filter((p) => p.category === product.category && p.id !== product.id)
            .slice(0, 6);
          if (related.length === 0) return null;
          return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground">Related products</h2>
                <Link
                  to={`/products?category=${encodeURIComponent(product.category)}`}
                  className="text-[11px] font-semibold text-primary"
                >
                  See all
                </Link>
              </div>
              <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
                <div className="flex gap-3 pb-1">
                  {related.map((rp) => {
                    const rDiscount = Math.round((1 - rp.price / rp.oldPrice) * 100);
                    return (
                      <Link
                        key={rp.id}
                        to={`/product/${rp.id}`}
                        className="w-36 shrink-0 rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="bg-secondary h-28 flex items-center justify-center text-5xl relative">
                          {rp.img}
                          {rDiscount > 0 && (
                            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-sale px-1.5 py-0.5 text-[9px] font-bold text-sale-foreground">
                              {rDiscount}% OFF
                            </span>
                          )}
                        </div>
                        <div className="p-2 space-y-1">
                          <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight min-h-[28px]">
                            {rp.name}
                          </p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-bold text-primary">
                              ₱{rp.price.toLocaleString("en-US")}
                            </span>
                            {rp.oldPrice > rp.price && (
                              <span className="text-[9px] text-muted-foreground line-through">
                                ₱{rp.oldPrice.toLocaleString("en-US")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-2.5 w-2.5 fill-star text-star" />
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {rp.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Quantity */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Quantity</span>
          <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="h-8 w-10 flex items-center justify-center text-sm font-semibold text-foreground border-x border-border">
              {qty}
            </span>
            <button
              onClick={() => setQty(qty + 1)}
              className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <BottomActionBar>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Total</p>
            <p className="text-base font-bold text-primary leading-tight">₱{(product.price * qty).toLocaleString("en-US")}</p>
          </div>
          <Button variant="outline" className="flex-1 h-11 rounded-xl gap-2 text-sm font-bold" onClick={handleAddToCart}>
            <ShoppingCart className="h-4 w-4" />
            Cart
          </Button>
          <Button className="flex-1 h-11 rounded-xl text-sm font-bold" onClick={() => toast({ title: "Proceeding to checkout", description: `Buying ${qty}x ${product.name}` })}>
            Buy Now
          </Button>
        </div>
      </BottomActionBar>

      <BottomNav />
    </div>
    </PageTransition>
  );
};

export default ProductDetail;

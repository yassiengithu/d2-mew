import { Link } from "react-router-dom";
import { Heart, Star, ShoppingCart, Trash2 } from "lucide-react";
import { products } from "@/data/products";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import SourceBadge from "@/components/SourceBadge";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const Favorites = () => {
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  const items = products.filter((p) => wishlist.includes(p.id));

  return (
    <PageTransition>
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="My Favorites" subtitle={`${items.length} saved ${items.length === 1 ? "item" : "items"}`} />

        {items.length === 0 ? (
          <div className="px-6 pt-12">
            <EmptyState
              icon={Heart}
              title="No favorites yet"
              description="Tap the heart on any product to save it here for later."
              action={
                <Button asChild className="rounded-xl h-11 px-6 text-sm font-bold">
                  <Link to="/products">Browse Products</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="px-4 py-3 space-y-2.5">
            {items.map((p) => (
              <div
                key={p.id}
                className="flex gap-3 rounded-2xl border border-border bg-card p-2.5 shadow-card"
              >
                <Link
                  to={`/product/${p.id}`}
                  className="relative h-20 w-20 shrink-0 rounded-xl bg-secondary flex items-center justify-center text-3xl overflow-hidden"
                >
                  {p.img}
                  <SourceBadge source={p.source} className="absolute bottom-1 left-1" />
                </Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <Link to={`/product/${p.id}`} className="min-w-0">
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground">
                      {p.category}
                    </span>
                    <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                      {p.name}
                    </p>
                  </Link>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-primary">
                          ₱{p.price.toLocaleString("en-US")}
                        </span>
                        <span className="text-[10px] text-muted-foreground line-through">
                          ₱{p.oldPrice.toLocaleString("en-US")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-star text-star" />
                        <span className="text-[10px] text-muted-foreground">
                          {p.rating} · {p.sold} sold
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        aria-label="Remove from favorites"
                        onClick={() => {
                          toggleWishlist(p.id);
                          toast({ title: "Removed from favorites", description: p.name });
                        }}
                        className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        aria-label="Add to cart"
                        onClick={() => {
                          addToCart(p, 1);
                          toast({ title: "Added to cart!", description: p.name });
                        }}
                        className="h-8 w-8 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 text-primary-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Favorites;

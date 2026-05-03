import { Star, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { products } from "@/data/products";
import SourceBadge from "@/components/SourceBadge";
import { useWishlist } from "@/context/WishlistContext";
import { memo, useCallback, useMemo, useState } from "react";

const featured = products.slice(0, 6);

const FeaturedProducts = () => {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const [poppedId, setPoppedId] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleWishlist = useCallback((e: React.MouseEvent, id: number) => {
    e.preventDefault();
    toggleWishlist(id);
    setPoppedId(id);
    setTimeout(() => setPoppedId(null), 300);
  }, [toggleWishlist]);

  const items = useMemo(() => featured, []);

  return (
    <section className="px-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-foreground leading-tight tracking-tight">Featured Products</h2>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground leading-tight">Popular picks from trusted sources</p>
        </div>
        <Link to="/products" className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground active:scale-95 transition-transform">See All</Link>
      </div>

        <div className="grid grid-cols-2 gap-2.5">
          {items.map((p) => (
            <Link
              to={`/product/${p.id}`}
              key={p.id}
              className="contain-card rounded-xl bg-card shadow-card overflow-hidden active:scale-[0.98] transition-transform"
            >
              <div className="relative bg-secondary flex items-center justify-center h-32 text-5xl">
                {p.img}
                <button
                  className="absolute top-2 right-2 rounded-full bg-card/80 p-1.5"
                  onClick={(e) => handleWishlist(e, p.id)}
                >
                  <Heart
                    className={`h-3.5 w-3.5 transition-colors ${
                      isWishlisted(p.id) ? "fill-destructive text-destructive" : "text-muted-foreground"
                    } ${poppedId === p.id ? "animate-heart-pop" : ""}`}
                  />
                </button>
                <SourceBadge source={p.source} className="absolute bottom-2 left-2" />
                <span className="absolute top-2 left-2 rounded-md bg-sale px-1.5 py-0.5 text-[9px] font-bold text-sale-foreground">
                  {Math.round((1 - p.price / p.oldPrice) * 100)}% OFF
                </span>
              </div>
              <div className="p-2.5">
                <span className="text-[9px] font-semibold uppercase text-muted-foreground">{p.category}</span>
                <p className="mt-0.5 text-[11px] text-foreground font-semibold line-clamp-2 leading-snug min-h-[2.5em]">{p.name}</p>
                <button
                  onClick={(e) => { e.preventDefault(); navigate(`/shop/${encodeURIComponent(p.seller.name)}`); }}
                  className="flex items-center gap-1 mt-0.5 text-left group/seller min-w-0 w-full"
                >
                  <span className="text-[11px] leading-none shrink-0">{p.seller.logo}</span>
                  <span className="text-[10px] text-muted-foreground truncate group-hover/seller:text-primary transition-colors">
                    {p.seller.name}
                  </span>
                </button>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-primary">₱{p.price.toLocaleString("en-US")}</span>
                  <span className="text-[10px] text-muted-foreground line-through">₱{p.oldPrice.toLocaleString("en-US")}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-star text-star" />
                    <span className="text-[10px] text-muted-foreground">{p.rating}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{p.sold} sold</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
    </section>
  );
};

export default memo(FeaturedProducts);

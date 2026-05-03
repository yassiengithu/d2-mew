import { Star, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { products } from "@/data/products";
import SourceBadge from "@/components/SourceBadge";

const YouMayAlsoLike = () => {
  // Skip the first 6 (shown in Featured) and pick a shuffled selection of up to 8.
  const picks = useMemo(() => {
    const pool = products.slice(6);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  }, []);

  if (picks.length === 0) return null;

  return (
    <section>
      <div className="flex items-end justify-between mb-3 px-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground leading-tight">
              You may also like
            </h2>
            <p className="text-[11px] font-medium text-muted-foreground leading-tight mt-0.5">
              Handpicked just for you
            </p>
          </div>
        </div>
        <Link
          to="/products"
          className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground active:scale-95 transition-transform shrink-0"
        >
          See All
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="relative">
        {/* Edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="overflow-x-auto scrollbar-none snap-x snap-mandatory">
          <div className="flex gap-3 px-4 pb-2 pt-1">
            {picks.map((p) => {
              const discount = Math.round((1 - p.price / p.oldPrice) * 100);
              return (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="group w-40 shrink-0 snap-start rounded-2xl bg-card border border-border/60 shadow-card overflow-hidden active:scale-[0.97] hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="relative bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center h-32 text-5xl overflow-hidden">
                    <span className="transition-transform duration-300 group-hover:scale-110">
                      {p.img}
                    </span>
                    <SourceBadge
                      source={p.source}
                      className="absolute bottom-1.5 left-1.5"
                    />
                    {discount > 0 && (
                      <span className="absolute top-1.5 right-1.5 rounded-md bg-sale px-1.5 py-0.5 text-[9px] font-bold text-sale-foreground shadow-sm">
                        -{discount}%
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {p.category}
                    </span>
                    <p className="text-[11px] text-foreground font-semibold line-clamp-2 leading-snug min-h-[2.5em]">
                      {p.name}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-primary">
                        ₱{p.price.toLocaleString("en-US")}
                      </span>
                      {p.oldPrice > p.price && (
                        <span className="text-[9px] text-muted-foreground line-through">
                          ₱{p.oldPrice.toLocaleString("en-US")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 pt-0.5">
                      <Star className="h-2.5 w-2.5 fill-star text-star" />
                      <span className="text-[10px] font-medium text-foreground tabular-nums">
                        {p.rating.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {p.sold} sold
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default YouMayAlsoLike;

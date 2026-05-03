import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ExternalLink, ImageIcon, ShoppingCart, Sparkles, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useSubmittedProducts } from "@/context/SubmittedProductsContext";
import BottomActionBar from "@/components/BottomActionBar";
import BottomNav from "@/components/BottomNav";
import Disclaimer from "@/components/Disclaimer";
import PageHeader from "@/components/PageHeader";
import PageTransition from "@/components/PageTransition";

const SubmittedProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products } = useSubmittedProducts();

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="Listing not found" />
        <div className="flex flex-col items-center justify-center gap-4 pt-24 px-8 text-center animate-fade-in">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
            <ShoppingCart className="h-9 w-9 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">This listing is unavailable</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            It may have been removed or the link is invalid.
          </p>
          <Button asChild className="rounded-xl h-11 px-8 text-sm font-bold mt-2">
            <Link to="/products">Browse Products</Link>
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-40">
        <header className="absolute top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full bg-card/90 flex items-center justify-center shadow-sm"
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <span className="flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[10px] font-bold text-success-foreground shadow-sm">
            <Sparkles className="h-3 w-3" />
            Community Listing
          </span>
        </header>

        <div className="bg-secondary flex items-center justify-center h-80 relative overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-16 w-16 text-muted-foreground" aria-hidden />
          )}
        </div>

        <div className="px-4 pt-4 space-y-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {product.category}
          </span>

          <h1 className="text-lg font-bold text-foreground leading-snug">{product.name}</h1>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">
              ₱{product.price.toLocaleString("en-US")}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Sold by
              </p>
              <p className="text-sm font-bold text-foreground truncate">{product.sellerName}</p>
            </div>
          </div>

          {product.externalUrl && (
            <a
              href={product.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <ExternalLink className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    External listing
                  </p>
                  <p className="text-xs font-semibold text-foreground truncate">
                    {(() => {
                      try {
                        return new URL(product.externalUrl).hostname.replace(/^www\./, "");
                      } catch {
                        return product.externalUrl;
                      }
                    })()}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-primary shrink-0">Open ↗</span>
            </a>
          )}

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1.5">Description</h2>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          <Disclaimer />
        </div>

        <BottomActionBar className="space-y-2">
          {product.externalUrl && (
            <Button
              asChild
              variant="outline"
              className="w-full h-11 rounded-xl gap-2 text-sm font-bold"
            >
              <a
                href={product.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Product Source in a new tab"
              >
                <ExternalLink className="h-4 w-4" />
                Open Product Source
              </a>
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Price</p>
              <p className="text-base font-bold text-primary leading-tight">
                ₱{product.price.toLocaleString("en-US")}
              </p>
            </div>
            <Button
              className="flex-1 h-11 rounded-xl gap-2 text-sm font-bold"
              onClick={() =>
                toast({
                  title: "Coming soon",
                  description: "Buying community-listed products is not yet available.",
                })
              }
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </BottomActionBar>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default SubmittedProductDetail;

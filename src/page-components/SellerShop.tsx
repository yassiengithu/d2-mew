import { useParams, useNavigate, Link } from "react-router-dom";
import { Star, MapPin, Store, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { products } from "@/data/products";
import { useCart } from "@/context/CartContext";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import SourceBadge from "@/components/SourceBadge";
import EmptyState from "@/components/EmptyState";

const SellerShop = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { addToCart: _addToCart } = useCart();

  const decodedName = decodeURIComponent(name || "");
  const sellerProducts = products.filter((p) => p.seller.name === decodedName);
  const seller = sellerProducts[0]?.seller;

  if (!seller) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="Shop not found" />
        <EmptyState
          className="pt-24"
          icon={Store}
          title="Shop unavailable"
          description={`We couldn't find a shop named "${decodedName}". It may have been removed or renamed.`}
          action={
            <Button asChild className="rounded-xl h-11 px-8 text-sm font-bold">
              <Link to="/products">Browse all products</Link>
            </Button>
          }
        />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
      {/* Header — gradient consistent with other pages */}
      <PageHeader title={seller.name} />

      {/* Seller Info */}
      <div className="px-4 pt-4 pb-4 flex items-center gap-3 border-b border-border">
        <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-2xl shadow-card">
          {seller.logo}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-foreground">{seller.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-star text-star" />
              <span className="text-xs font-semibold text-foreground">{seller.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{seller.location}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{sellerProducts.length} products</p>
        </div>
      </div>

      {/* Product List */}
      <div className="px-4 pt-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">All Products</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {sellerProducts.map((product, i) => {
            const discount = Math.round((1 - product.price / product.oldPrice) * 100);
            return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="contain-card rounded-xl bg-card shadow-card overflow-hidden animate-fade-in active:scale-[0.98] transition-transform"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative bg-secondary flex items-center justify-center h-32 text-5xl">
                  {product.img}
                  <SourceBadge source={product.source} className="absolute bottom-2 left-2" />
                  {discount >= 20 && (
                    <span className="absolute top-2 left-2 rounded-md bg-sale px-1.5 py-0.5 text-[9px] font-bold text-sale-foreground">
                      {discount}% OFF
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-snug min-h-[2.5em]">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[11px] leading-none shrink-0">{product.seller.logo}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{product.seller.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-sm font-bold text-primary">₱{product.price.toLocaleString("en-US")}</span>
                    {product.oldPrice > product.price && (
                      <span className="text-[9px] text-muted-foreground line-through">₱{product.oldPrice.toLocaleString("en-US")}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-star text-star" />
                      <span className="text-[10px] text-muted-foreground">{product.rating}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{product.sold} sold</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SellerShop;

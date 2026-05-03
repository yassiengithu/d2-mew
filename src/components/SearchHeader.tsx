import { Search, ShoppingCart, MessageCircle } from "lucide-react";
import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";

const SearchHeader = () => {
  const navigate = useNavigate();
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-50 px-4 py-3" style={{ background: "var(--gradient-primary)" }}>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => navigate("/products")}
          aria-label="Search products"
          className="flex-1 flex items-center gap-2 rounded-full bg-primary-foreground/95 px-3.5 py-2 text-left active:scale-[0.98] transition-transform"
        >
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">Search products...</span>
        </button>
        <Link
          to="/cart"
          aria-label={`View cart${totalItems > 0 ? ` (${totalItems} items)` : ""}`}
          className="relative p-1.5 rounded-full active:bg-primary-foreground/10 transition-colors"
        >
          <ShoppingCart className="h-5 w-5 text-primary-foreground" />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
        </Link>
        <Link
          to="/messages"
          aria-label="Messages"
          className="p-1.5 rounded-full active:bg-primary-foreground/10 transition-colors"
        >
          <MessageCircle className="h-5 w-5 text-primary-foreground" />
        </Link>
      </div>
    </header>
  );
};

export default memo(SearchHeader);

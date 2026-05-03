import { Bell, Heart, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useNotifications } from "@/context/NotificationsContext";
import { memo } from "react";
import PrefetchLink from "@/components/PrefetchLink";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: LayoutGrid, label: "Shop", path: "/products" },
  { icon: Heart, label: "Saved", path: "/favorites" },
  { icon: Bell, label: "Alerts", path: "/notifications" },
  { icon: ShoppingCart, label: "Cart", path: "/cart" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const { pathname } = useLocation();
  const { totalItems } = useCart();
  const { unreadCount } = useNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-6 py-1.5">
        {tabs.map((t) => {
          const active = pathname === t.path;
          const badge =
            t.label === "Cart" ? totalItems : t.label === "Alerts" ? unreadCount : 0;
          return (
            <PrefetchLink
              key={t.label}
              to={t.path}
              className={`relative flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg transition-colors ${
                active ? "text-primary" : "text-muted-foreground active:bg-secondary"
              }`}
            >
              <div className="relative">
                <t.icon
                  className={`h-5 w-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                  fill={active ? "currentColor" : "none"}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-none ${active ? "text-primary" : "text-muted-foreground"}`}>
                {t.label}
              </span>
            </PrefetchLink>
          );
        })}
      </div>
    </nav>
  );
};

export default memo(BottomNav);

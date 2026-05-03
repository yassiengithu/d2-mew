import { Heart, Package, Settings, ChevronRight, LogOut, HelpCircle, Bell, CreditCard, Wallet, PackagePlus, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { useOrders } from "@/context/OrdersContext";
import BottomNav from "@/components/BottomNav";
import Disclaimer from "@/components/Disclaimer";
import SavedAddressCard from "@/components/SavedAddressCard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

type SellerStats = {
  total_sales: number;
  total_commission_paid: number;
  net_earnings: number;
};

const menuItems = [
  { icon: PackagePlus, label: "Sell a Product", desc: "Submit a new listing", path: "/sell", enabled: true },
  { icon: Store, label: "My Products", desc: "Listings you've submitted", path: "/my-products", enabled: true },
  { icon: Package, label: "My Orders", desc: "Track & manage orders", path: "/orders", enabled: true },
  { icon: Heart, label: "My Favorites", desc: "Products you've saved", path: "/favorites", enabled: true },
  { icon: CreditCard, label: "Payment Methods", desc: "Manage cards & wallets", path: "", enabled: false },
  { icon: Bell, label: "Notifications", desc: "Alerts & updates", path: "", enabled: false },
  { icon: HelpCircle, label: "Help Center", desc: "FAQ & support", path: "", enabled: false },
  { icon: Settings, label: "Settings", desc: "Account preferences", path: "", enabled: false },
];

const Profile = () => {
  const navigate = useNavigate();
  const { wishlist } = useWishlist();
  const { totalItems } = useCart();
  const { orders } = useOrders();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<SellerStats>({ total_sales: 0, total_commission_paid: 0, net_earnings: 0 });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("sellers")
      .select("total_sales,total_commission_paid,net_earnings")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStats({
            total_sales: Number(data.total_sales) || 0,
            total_commission_paid: Number(data.total_commission_paid) || 0,
            net_earnings: Number(data.net_earnings) || 0,
          });
        }
      });
  }, [user]);

  const displayName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Shopper";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "You have been signed out." });
    navigate("/auth", { replace: true });
  };

  const handleDisabledTap = (label: string) => {
    toast({ title: `${label} coming soon`, description: "This feature is not available yet." });
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
      {/* Header */}
      <div className="px-4 pt-10 pb-8 rounded-b-3xl" style={{ background: "var(--gradient-primary)" }}>
        <h1 className="text-primary-foreground text-lg font-bold mb-5">My Profile</h1>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary-foreground/30">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xl font-bold">
              {avatarLetter}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-primary-foreground font-semibold text-base">{displayName}</p>
            <p className="text-primary-foreground/70 text-sm">{user?.email ?? "Manage your activity"}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 -mt-5">
        <Card className="flex justify-around py-4 shadow-[var(--shadow-elevated)]">
          <Link to="/cart" className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold text-foreground">{totalItems}</span>
            <span className="text-xs text-muted-foreground">In Cart</span>
          </Link>
          <div className="w-px bg-border" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold text-foreground">{wishlist.length}</span>
            <span className="text-xs text-muted-foreground">Wishlist</span>
          </div>
          <div className="w-px bg-border" />
          <Link to="/orders" className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold text-foreground">{orders.length}</span>
            <span className="text-xs text-muted-foreground">Orders</span>
          </Link>
        </Card>
      </div>

      {/* Seller Earnings */}
      <div className="px-4 mt-5">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Seller Earnings</h2>
              <p className="text-[11px] text-muted-foreground">From completed orders only</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2.5">
              <span className="text-xs text-muted-foreground font-semibold">Total Sales</span>
              <span className="text-sm font-bold text-foreground tabular-nums">₱{stats.total_sales.toLocaleString("en-US")}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2.5">
              <span className="text-xs text-muted-foreground font-semibold">Commission Paid</span>
              <span className="text-sm font-bold text-foreground tabular-nums">₱{stats.total_commission_paid.toLocaleString("en-US")}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2.5">
              <span className="text-xs text-primary font-semibold">Net Earnings</span>
              <span className="text-base font-extrabold text-primary tabular-nums">₱{stats.net_earnings.toLocaleString("en-US")}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Saved address */}
      <div className="px-4 mt-5">
        <SavedAddressCard />
      </div>

      {/* Menu */}
      <div className="px-4 mt-5 space-y-1.5">
        {menuItems.map((item) =>
          item.enabled ? (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-card hover:bg-secondary transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                <item.icon className="h-4.5 w-4.5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ) : (
            <button
              key={item.label}
              onClick={() => handleDisabledTap(item.label)}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-card hover:bg-secondary transition-colors opacity-60"
            >
              <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                <item.icon className="h-4.5 w-4.5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )
        )}
      </div>

      {/* Sign Out */}
      <div className="px-4 mt-6">
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/5"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="px-4 mt-6 mb-4">
        <Disclaimer />
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;

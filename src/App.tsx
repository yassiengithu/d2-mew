import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { OrdersProvider } from "@/context/OrdersContext";
import { SubmittedProductsProvider } from "@/context/SubmittedProductsContext";
import { RatingsProvider } from "@/context/RatingsContext";
import { MessagesProvider } from "@/context/MessagesContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";
import TopProgressBar from "@/components/TopProgressBar";
import RoutePageSkeleton from "@/components/RoutePageSkeleton";
import { prefetchPrimaryRoutes } from "@/lib/routePrefetch";

// Lazy-load all pages to keep the initial bundle small.
const Index = lazy(() => import("@/page-components/Index"));
const Products = lazy(() => import("@/page-components/Products"));
const ProductDetail = lazy(() => import("@/page-components/ProductDetail"));
const Cart = lazy(() => import("@/page-components/Cart"));
const Checkout = lazy(() => import("@/page-components/Checkout"));
const Favorites = lazy(() => import("@/page-components/Favorites"));
const Orders = lazy(() => import("@/page-components/Orders"));
const OrderDetail = lazy(() => import("@/page-components/OrderDetail"));
const Profile = lazy(() => import("@/page-components/Profile"));
const Auth = lazy(() => import("@/page-components/Auth"));
const Sell = lazy(() => import("@/page-components/Sell"));
const MyProducts = lazy(() => import("@/page-components/MyProducts"));
const SubmittedProductDetail = lazy(() => import("@/page-components/SubmittedProductDetail"));
const SellerShop = lazy(() => import("@/page-components/SellerShop"));
const Messages = lazy(() => import("@/page-components/Messages"));
const MessageThread = lazy(() => import("@/page-components/MessageThread"));
const Notifications = lazy(() => import("@/page-components/Notifications"));
const Admin = lazy(() => import("@/page-components/Admin"));
const AdminDashboard = lazy(() => import("@/page-components/AdminDashboard"));
const SellerDashboard = lazy(() => import("@/page-components/SellerDashboard"));
const ShippingCalculator = lazy(() => import("@/page-components/ShippingCalculator"));
const TrackShipment = lazy(() => import("@/page-components/TrackShipment"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false },
  },
});

const AppRoutes = () => (
  <Suspense fallback={<RoutePageSkeleton />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/products" element={<Products />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/orders/:id" element={<OrderDetail />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/sell" element={<Sell />} />
      <Route path="/my-products" element={<MyProducts />} />
      <Route path="/submission/:id" element={<SubmittedProductDetail />} />
      <Route path="/shop/:name" element={<SellerShop />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/:id" element={<MessageThread />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/seller-dashboard" element={<SellerDashboard />} />
      <Route path="/shipping-calculator" element={<ShippingCalculator />} />
      <Route path="/track" element={<TrackShipment />} />
      <Route path="/track/:trackingNumber" element={<TrackShipment />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const PrefetchTrigger = () => {
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
    };
    const schedule =
      w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    schedule(() => prefetchPrimaryRoutes());
  }, []);
  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <WishlistProvider>
          <CartProvider>
            <OrdersProvider>
              <RatingsProvider>
                <MessagesProvider>
                  <NotificationsProvider>
                    <SubmittedProductsProvider>
                      <Toaster />
                      <Sonner />
                      <BrowserRouter>
                        <ScrollToTop />
                        <TopProgressBar />
                        <PrefetchTrigger />
                        <RouteErrorBoundary>
                          <AppRoutes />
                        </RouteErrorBoundary>
                      </BrowserRouter>
                    </SubmittedProductsProvider>
                  </NotificationsProvider>
                </MessagesProvider>
              </RatingsProvider>
            </OrdersProvider>
          </CartProvider>
        </WishlistProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

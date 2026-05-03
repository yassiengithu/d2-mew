// Centralized lazy-loaded route chunk prefetcher.
// Each entry returns the same Promise the lazy() factory uses, so calling
// it eagerly warms the module cache. Subsequent navigations resolve
// instantly without a network round-trip for the chunk.

type Loader = () => Promise<unknown>;

const loaders: Record<string, Loader> = {
  "/products": () => import("@/page-components/Products.tsx"),
  "/cart": () => import("@/page-components/Cart.tsx"),
  "/favorites": () => import("@/page-components/Favorites.tsx"),
  "/notifications": () => import("@/page-components/Notifications.tsx"),
  "/profile": () => import("@/page-components/Profile.tsx"),
  "/orders": () => import("@/page-components/Orders.tsx"),
  "/checkout": () => import("@/page-components/Checkout.tsx"),
  "/sell": () => import("@/page-components/Sell.tsx"),
  "/messages": () => import("@/page-components/Messages.tsx"),
  "/my-products": () => import("@/page-components/MyProducts.tsx"),
  "/auth": () => import("@/page-components/Auth.tsx"),
  "/admin": () => import("@/page-components/Admin.tsx"),
  "product-detail": () => import("@/page-components/ProductDetail.tsx"),
  "seller-shop": () => import("@/page-components/SellerShop.tsx"),
  "submission-detail": () => import("@/page-components/SubmittedProductDetail.tsx"),
  "order-detail": () => import("@/page-components/OrderDetail.tsx"),
  "message-thread": () => import("@/page-components/MessageThread.tsx"),
};

const started = new Set<string>();

export const prefetchRoute = (path: string) => {
  // Map dynamic paths to their static loader keys.
  let key = path;
  if (path.startsWith("/product/")) key = "product-detail";
  else if (path.startsWith("/shop/")) key = "seller-shop";
  else if (path.startsWith("/submission/")) key = "submission-detail";
  else if (path.startsWith("/orders/")) key = "order-detail";
  else if (path.startsWith("/messages/")) key = "message-thread";

  if (started.has(key)) return;
  const loader = loaders[key];
  if (!loader) return;
  started.add(key);
  // Fire and forget — errors are surfaced again when the route is actually visited.
  loader().catch(() => started.delete(key));
};

/** Warm the chunks for the most likely next destinations after first paint. */
export const prefetchPrimaryRoutes = () => {
  ["/products", "/cart", "/favorites", "/profile"].forEach(prefetchRoute);
};

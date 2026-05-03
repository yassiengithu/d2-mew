import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls window to the top whenever the route pathname changes.
 * Mounted once inside <BrowserRouter> so every navigation starts at the top —
 * matching native mobile-app expectations.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Defer to after paint to avoid fighting browser's restoration on back-nav.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

export default ScrollToTop;

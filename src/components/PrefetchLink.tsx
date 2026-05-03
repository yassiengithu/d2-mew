import { forwardRef, useCallback } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { prefetchRoute } from "@/lib/routePrefetch";

/**
 * Drop-in replacement for react-router's <Link> that warms the lazy
 * route chunk on hover / focus / touch so the destination page renders
 * instantly when the user actually clicks.
 */
const PrefetchLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, onMouseEnter, onFocus, onTouchStart, ...rest }, ref) => {
    const path = typeof to === "string" ? to : to.pathname ?? "";

    const warm = useCallback(() => prefetchRoute(path), [path]);

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={(e) => {
          warm();
          onMouseEnter?.(e);
        }}
        onFocus={(e) => {
          warm();
          onFocus?.(e);
        }}
        onTouchStart={(e) => {
          warm();
          onTouchStart?.(e);
        }}
        {...rest}
      />
    );
  },
);

PrefetchLink.displayName = "PrefetchLink";

export default PrefetchLink;

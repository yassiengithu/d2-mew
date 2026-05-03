import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/context/OrdersContext";
import { getOrderStatusVisual } from "@/lib/orderStatus";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
  variant?: "filled" | "outline";
  className?: string;
}

/**
 * Unified order status pill used across Orders list, Order detail, and admin tools.
 * Mirrors the visual contract of PaymentStatusBadge.
 */
const OrderStatusBadge = ({
  status,
  size = "sm",
  variant = "filled",
  className,
}: OrderStatusBadgeProps) => {
  const visual = getOrderStatusVisual(status);
  const Icon = visual.icon;

  const sizeClasses =
    size === "md"
      ? "text-xs px-2.5 py-1 gap-1.5"
      : "text-[11px] px-2 py-0.5 gap-1";
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <span
      role="status"
      aria-label={`Order status: ${visual.label}`}
      className={cn(
        "inline-flex items-center rounded-full font-bold uppercase tracking-wide whitespace-nowrap",
        sizeClasses,
        variant === "outline" ? `border ${visual.surface}` : visual.badge,
        visual.pulse && "animate-pulse",
        className,
      )}
    >
      <Icon className={cn(iconSize, visual.animate && "animate-spin")} aria-hidden />
      {visual.label}
    </span>
  );
};

export default OrderStatusBadge;

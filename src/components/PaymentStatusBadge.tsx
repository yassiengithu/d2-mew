import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/context/OrdersContext";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_SHORT,
  PAYMENT_STATUS_VISUALS,
} from "@/lib/paymentStatus";

type Size = "sm" | "md" | "lg";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  /** Visual size of the badge. Defaults to `md`. */
  size?: Size;
  /** Use the compact label (e.g., "Verifying" instead of "Under Verification"). */
  short?: boolean;
  /** Hide the icon, show only label and (optional) dot. */
  hideIcon?: boolean;
  /** Show a leading colored dot indicator. */
  withDot?: boolean;
  className?: string;
}

const SIZE_STYLES: Record<Size, { wrap: string; icon: string; dot: string }> = {
  sm: { wrap: "px-2 py-0.5 text-[10px] gap-1 rounded-full", icon: "h-3 w-3", dot: "h-1.5 w-1.5" },
  md: { wrap: "px-2.5 py-1 text-[11px] gap-1.5 rounded-full", icon: "h-3.5 w-3.5", dot: "h-2 w-2" },
  lg: { wrap: "px-3 py-1.5 text-xs gap-1.5 rounded-full", icon: "h-4 w-4", dot: "h-2 w-2" },
};

/**
 * Unified payment status pill used across checkout, orders list, order detail.
 * Always wraps the same `PAYMENT_STATUS_VISUALS` config so colors stay consistent.
 */
export const PaymentStatusBadge = forwardRef<HTMLSpanElement, PaymentStatusBadgeProps & React.HTMLAttributes<HTMLSpanElement>>(({
  status,
  size = "md",
  short = false,
  hideIcon = false,
  withDot = false,
  className,
  ...rest
}, ref) => {
  const v = PAYMENT_STATUS_VISUALS[status];
  const sz = SIZE_STYLES[size];
  const Icon = v.icon;
  const label = short ? PAYMENT_STATUS_SHORT[status] : PAYMENT_STATUS_LABELS[status];

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center font-bold whitespace-nowrap leading-none",
        sz.wrap,
        v.badge,
        className,
      )}
      role="status"
      aria-label={`Payment status: ${PAYMENT_STATUS_LABELS[status]}`}
      {...rest}
    >
      {withDot && (
        <span
          className={cn("rounded-full shrink-0", sz.dot, v.dot, v.spin && "animate-pulse")}
          aria-hidden="true"
        />
      )}
      {!hideIcon && (
        <Icon className={cn(sz.icon, "shrink-0", v.spin && "animate-spin")} aria-hidden="true" />
      )}
      {label}
    </span>
  );
});
PaymentStatusBadge.displayName = "PaymentStatusBadge";

export default PaymentStatusBadge;

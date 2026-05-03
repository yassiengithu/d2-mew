import { AlertCircle, Loader2, CheckCircle, XCircle, type LucideIcon } from "lucide-react";
import type { PaymentStatus } from "@/context/OrdersContext";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Awaiting Payment",
  under_review: "Verifying Payment",
  paid: "Paid",
  failed: "Failed",
};

/** Compact label for tight UI like list rows. */
export const PAYMENT_STATUS_SHORT: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  under_review: "Verifying",
  paid: "Paid",
  failed: "Failed",
};

export interface PaymentStatusVisual {
  /** Tailwind classes for the badge background + text (semantic tokens only). */
  badge: string;
  /** Tailwind classes for a soft tinted surface (cards, helper rows). */
  surface: string;
  /** Tailwind class for the accent text only. */
  text: string;
  /** Tailwind class for a 2-color border (use with `border-2`). */
  ring: string;
  /** Solid dot color for indicator dots. */
  dot: string;
  /** Lucide icon for the status. */
  icon: LucideIcon;
  /** Whether the icon should spin (for in-progress states). */
  spin: boolean;
  /** Hint sentence shown next to the badge. */
  hint: string;
}

export const PAYMENT_STATUS_VISUALS: Record<PaymentStatus, PaymentStatusVisual> = {
  unpaid: {
    badge: "bg-warning/20 text-warning-foreground border border-warning/50",
    surface: "bg-warning/10",
    text: "text-warning-foreground",
    ring: "border-warning/50",
    dot: "bg-warning",
    icon: AlertCircle,
    spin: false,
    hint: "Complete payment to start processing",
  },
  under_review: {
    badge: "bg-info/15 text-info",
    surface: "bg-info/10",
    text: "text-info",
    ring: "border-info/40",
    dot: "bg-info",
    icon: Loader2,
    spin: true,
    hint: "Verifying your payment — usually a few minutes",
  },
  paid: {
    badge: "bg-success/15 text-success",
    surface: "bg-success/10",
    text: "text-success",
    ring: "border-success/40",
    dot: "bg-success",
    icon: CheckCircle,
    spin: false,
    hint: "Payment confirmed",
  },
  failed: {
    badge: "bg-destructive/15 text-destructive",
    surface: "bg-destructive/10",
    text: "text-destructive",
    ring: "border-destructive/40",
    dot: "bg-destructive",
    icon: XCircle,
    spin: false,
    hint: "Payment didn't go through",
  },
};

/**
 * Backwards-compatible export — same shape as before so call sites keep working.
 */
export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  unpaid: PAYMENT_STATUS_VISUALS.unpaid.badge,
  under_review: PAYMENT_STATUS_VISUALS.under_review.badge,
  paid: PAYMENT_STATUS_VISUALS.paid.badge,
  failed: PAYMENT_STATUS_VISUALS.failed.badge,
};

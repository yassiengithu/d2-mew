/**
 * Payment gateway scaffolding.
 *
 * This module is a **placeholder** that defines the shape of the real
 * payment integration without performing any network calls.
 *
 * When a real provider (Stripe, Paddle, etc.) is wired in:
 *   1. Replace `simulatePaymentRoundtrip()` below with a call to your edge
 *      function that creates a checkout session / payment intent.
 *   2. Have your webhook handler call `markOrderPaid()` / `markOrderFailed()`
 *      from `OrdersContext` when the provider notifies you of the outcome.
 *
 * The rest of the app already speaks in terms of `PaymentResult`, so swapping
 * the implementation should not require UI changes.
 */

import type { PlacedOrder, PaymentMethodId } from "@/context/OrdersContext";

/** Why a payment failed. Mirrors the categories most providers expose. */
export type PaymentFailureReason =
  | "declined"
  | "insufficient_funds"
  | "expired_card"
  | "cancelled"
  | "network_error"
  | "unknown";

export interface PaymentSuccess {
  status: "success";
  /** Provider transaction ID. Useful for receipts / refunds. */
  transactionId: string;
  /** ISO timestamp of when the provider confirmed the charge. */
  paidAt: string;
  /** Amount charged in the smallest currency unit (e.g. centavos). */
  amount: number;
  currency: string;
  method: PaymentMethodId;
}

export interface PaymentFailure {
  status: "failure";
  reason: PaymentFailureReason;
  /** Human-friendly message safe to surface in toasts. */
  message: string;
}

export type PaymentResult = PaymentSuccess | PaymentFailure;

export interface StartPaymentOptions {
  /** Called when the provider confirms the charge succeeded. */
  onSuccess?: (result: PaymentSuccess) => void;
  /** Called when the provider reports the charge failed or was cancelled. */
  onFailure?: (result: PaymentFailure) => void;
  /**
   * Override the simulated outcome — useful for tests / dev tooling.
   * In production this is decided by the provider.
   */
  forceOutcome?: "success" | "failure";
}

const FAILURE_MESSAGES: Record<PaymentFailureReason, string> = {
  declined: "Your card was declined. Try a different card or method.",
  insufficient_funds: "Insufficient funds on the selected payment method.",
  expired_card: "That card has expired. Please use a different card.",
  cancelled: "Payment was cancelled before it could complete.",
  network_error: "We couldn't reach the payment processor. Please try again.",
  unknown: "Something went wrong while processing your payment.",
};

/**
 * Simulates the round-trip to a real provider.
 *
 * TODO: replace with a real call once a provider is enabled.
 *   e.g. `await supabase.functions.invoke("create-checkout", { body: { orderId } })`
 */
const simulatePaymentRoundtrip = (
  order: PlacedOrder,
  forceOutcome?: "success" | "failure",
): Promise<PaymentResult> =>
  new Promise((resolve) => {
    const latencyMs = 1200 + Math.floor(Math.random() * 600);
    setTimeout(() => {
      const succeeds = forceOutcome
        ? forceOutcome === "success"
        : Math.random() > 0.25; // 75% success in dev so the happy path is easy to demo.

      if (succeeds) {
        resolve({
          status: "success",
          transactionId: `mock_tx_${Date.now().toString(36)}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          paidAt: new Date().toISOString(),
          amount: Math.round(order.total * 100),
          currency: "PHP",
          method: order.payment?.id ?? "card",
        });
        return;
      }

      const reasons: PaymentFailureReason[] = [
        "declined",
        "insufficient_funds",
        "expired_card",
        "network_error",
      ];
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      resolve({
        status: "failure",
        reason,
        message: FAILURE_MESSAGES[reason],
      });
    }, latencyMs);
  });

/**
 * Kick off a payment attempt for an order.
 *
 * Returns a promise that resolves with the final `PaymentResult` so callers
 * can `await` it, but also accepts `onSuccess` / `onFailure` callbacks for
 * UI ergonomics.
 */
export const startPayment = async (
  order: PlacedOrder,
  options: StartPaymentOptions = {},
): Promise<PaymentResult> => {
  const result = await simulatePaymentRoundtrip(order, options.forceOutcome);

  if (result.status === "success") {
    options.onSuccess?.(result);
  } else {
    options.onFailure?.(result);
  }

  return result;
};

/**
 * Type guards for callers that want to narrow without inspecting the discriminant.
 */
export const isPaymentSuccess = (r: PaymentResult): r is PaymentSuccess =>
  r.status === "success";

export const isPaymentFailure = (r: PaymentResult): r is PaymentFailure =>
  r.status === "failure";

/* -------------------------------------------------------------------------- */
/*  Per-order payment URL generation                                          */
/* -------------------------------------------------------------------------- */

export interface GeneratedPaymentUrl {
  /** Provider-hosted checkout URL for this specific order. */
  url: string;
  /** ISO timestamp after which the URL should be regenerated. */
  expiresAt: string;
  /** Provider session/intent id, for correlating webhooks. */
  reference: string;
}

/**
 * Generate a payment URL for a specific order.
 *
 * **Placeholder** — returns a deterministic stub URL keyed off the order id so
 * the rest of the app can already render and store per-order links. Replace
 * the body with a real provider call when an integration is wired in, e.g.:
 *
 * ```ts
 * const { data } = await supabase.functions.invoke("create-checkout", {
 *   body: { orderId: order.id, amount: order.total, currency: "PHP" },
 * });
 * return { url: data.url, expiresAt: data.expires_at, reference: data.id };
 * ```
 *
 * The function is async on purpose so swapping in a network call is a no-op
 * for callers.
 */
export const createPaymentUrl = async (
  order: PlacedOrder,
): Promise<GeneratedPaymentUrl> => {
  // Simulate the latency of a real provider round-trip.
  await new Promise((r) => setTimeout(r, 400));

  const reference = `mock_sess_${order.id}_${Date.now().toString(36)}`;
  // Stub URL — clearly fake, but unique per order so the UI can treat it as
  // dynamic. A real provider returns something like
  // https://checkout.stripe.com/c/pay/cs_test_... or https://pay.gcash.com/...
  const url = `https://pay.placeholder.local/checkout/${encodeURIComponent(
    reference,
  )}?amount=${Math.round(order.total * 100)}&currency=PHP`;
  // 30-minute window matches what most hosted checkouts use.
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return { url, expiresAt, reference };
};

/** True if the stored payment URL is missing or past its expiry. */
export const isPaymentUrlStale = (
  paymentUrl?: string,
  expiresAt?: string,
): boolean => {
  if (!paymentUrl) return true;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
};

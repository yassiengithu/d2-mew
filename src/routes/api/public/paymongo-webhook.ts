import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/paymongo-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          const payload = JSON.parse(body);

          const event = payload?.data?.attributes;
          if (!event) {
            return new Response("Missing event data", { status: 400 });
          }

          const eventType = event.type ?? payload?.data?.type;

          // Handle checkout_session.payment.paid
          if (
            eventType === "checkout_session.payment.paid" ||
            event.status === "paid"
          ) {
            const checkoutData = event.data?.attributes ?? event;
            const orderId =
              checkoutData?.metadata?.order_id ??
              checkoutData?.reference_number ??
              null;

            if (!orderId) {
              console.warn("PayMongo webhook: no order_id in metadata");
              return new Response("No order_id", { status: 200 });
            }

            // Use supabaseAdmin to bypass RLS for webhook processing
            const { createClient } = await import("@supabase/supabase-js");
            const supabaseAdmin = createClient(
              process.env.SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Update order payment_status to "paid"
            // This triggers the create_seller_earnings_on_payment DB trigger
            const { error } = await supabaseAdmin
              .from("orders")
              .update({ payment_status: "paid", status: "paid" })
              .eq("id", orderId);

            if (error) {
              console.error("Failed to mark order paid:", error);
              return new Response("DB error", { status: 500 });
            }

            console.log(`Order ${orderId} marked as paid via PayMongo webhook`);
            return new Response("OK", { status: 200 });
          }

          // Acknowledge other events
          return new Response("Event received", { status: 200 });
        } catch (err) {
          console.error("PayMongo webhook error:", err);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});

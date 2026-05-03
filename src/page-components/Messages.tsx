import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/context/MessagesContext";
import { products } from "@/data/products";
import { useMemo } from "react";

const Messages = () => {
  const navigate = useNavigate();
  const { userId, messages, loading } = useMessages();

  const threads = useMemo(() => {
    const byKey = new Map<
      string,
      { productId: number; sellerName: string; last: (typeof messages)[number] }
    >();
    for (const m of messages) {
      const key = `${m.product_id}`;
      const existing = byKey.get(key);
      if (!existing || existing.last.created_at < m.created_at) {
        byKey.set(key, { productId: m.product_id, sellerName: m.seller_name, last: m });
      }
    }
    return Array.from(byKey.values()).sort((a, b) =>
      a.last.created_at < b.last.created_at ? 1 : -1,
    );
  }, [messages]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="Messages" />

        <main className="px-4 py-3">
          {!userId ? (
            <div className="px-2 pt-12">
              <EmptyState
                icon={MessageCircle}
                title="Sign in to view messages"
                description="Chat with sellers about products you're interested in."
                action={
                  <Button onClick={() => navigate("/auth")} className="rounded-xl h-11 px-6 text-sm font-bold">
                    Sign in
                  </Button>
                }
              />
            </div>
          ) : loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[72px] rounded-2xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="px-2 pt-12">
              <EmptyState
                icon={MessageCircle}
                title="No conversations yet"
                description="Start by messaging a seller from any product page."
                action={
                  <Button asChild className="rounded-xl h-11 px-6 text-sm font-bold">
                    <Link to="/products">Browse Products</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="space-y-2.5">
              {threads.map((t) => {
                const product = products.find((p) => p.id === t.productId);
                const preview =
                  (t.last.sender === "buyer" ? "You: " : "") + t.last.body;
                return (
                  <li key={t.productId}>
                    <Link
                      to={`/messages/${t.productId}`}
                      className="flex items-center gap-3 p-2.5 rounded-2xl border border-border bg-card shadow-card active:bg-secondary transition-colors"
                    >
                      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">
                        {product?.img ?? "🛍️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{t.sellerName}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(t.last.created_at).toLocaleDateString("en-US")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>
                        {product && (
                          <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                            Re: {product.name}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Messages;

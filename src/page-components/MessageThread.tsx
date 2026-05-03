import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageCircle, PackageX } from "lucide-react";
import { z } from "zod";

const MAX_MESSAGE_LENGTH = 2000;
const messageSchema = z
  .string()
  .trim()
  .min(1, { message: "Message cannot be empty" })
  .max(MAX_MESSAGE_LENGTH, { message: `Message must be under ${MAX_MESSAGE_LENGTH} characters` });
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useMessages } from "@/context/MessagesContext";
import { useRatings } from "@/context/RatingsContext";
import { products } from "@/data/products";

const MessageThread = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = Number(id);
  const product = products.find((p) => p.id === productId);
  const { userId, getThread, sendMessage, loading } = useMessages();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { getReviewerName } = useRatings();
  const thread = useMemo(() => getThread(productId), [getThread, productId]);
  const buyerName = userId ? getReviewerName(userId) : "You";
  const buyerInitial = buyerName.trim().charAt(0).toUpperCase() || "Y";

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const formatDayLabel = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === y.toDateString();
    if (sameDay) return "Today";
    if (isYesterday) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.length]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto relative pb-20">
        <PageHeader title="Conversation" />
        <EmptyState icon={PackageX} title="Product not found" description="This conversation's product is no longer available." />
        <BottomNav />
      </div>
    );
  }

  const handleSend = async () => {
    if (!userId) {
      navigate("/auth");
      return;
    }
    const parsed = messageSchema.safeParse(draft);
    if (!parsed.success) {
      toast({
        title: "Can't send message",
        description: parsed.error.issues[0]?.message ?? "Invalid message",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    const ok = await sendMessage(product.id, product.seller.name, parsed.data);
    setSending(false);
    if (ok) {
      setDraft("");
    } else {
      toast({ title: "Couldn't send", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background max-w-md mx-auto relative flex flex-col">
        <PageHeader title={product.seller.name} />

        {/* Product context card */}
        <Link
          to={`/product/${product.id}`}
          className="mx-3 mt-3 flex items-center gap-3 p-3 rounded-2xl border border-border bg-card active:bg-secondary transition-colors shadow-sm"
        >
          <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
            {product.img}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
            <p className="text-xs text-primary font-bold mt-0.5">₱{product.price.toLocaleString("en-US")}</p>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground shrink-0">View →</span>
        </Link>

        {/* Thread */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-4"
          style={{ paddingBottom: "140px" }}
        >
          {!userId ? (
            <EmptyState
              icon={MessageCircle}
              title="Sign in to chat"
              description="You need an account to message sellers."
              action={
                <Button onClick={() => navigate("/auth")} className="rounded-xl h-11 px-6 text-sm font-bold">
                  Sign in
                </Button>
              }
            />
          ) : loading && thread.length === 0 ? (
            <div className="space-y-3">
              <div className="h-12 w-3/4 rounded-2xl bg-secondary animate-pulse" />
              <div className="h-12 w-2/3 ml-auto rounded-2xl bg-secondary animate-pulse" />
              <div className="h-12 w-1/2 rounded-2xl bg-secondary animate-pulse" />
            </div>
          ) : thread.length === 0 ? (
            <div className="text-center py-14 px-6">
              <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Start the conversation</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-xs mx-auto">
                Ask {product.seller.name} about shipping, sizes, availability, or anything else.
              </p>
            </div>
          ) : (
            thread.map((m, i) => {
              const mine = m.sender === "buyer";
              const prev = thread[i - 1];
              const next = thread[i + 1];
              const prevDay = prev ? new Date(prev.created_at).toDateString() : null;
              const curDay = new Date(m.created_at).toDateString();
              const showDaySeparator = prevDay !== curDay;
              const showHeader = !prev || prev.sender !== m.sender || showDaySeparator;
              const isLastOfRun = !next || next.sender !== m.sender;
              const senderName = mine ? buyerName : m.seller_name;
              const avatarInitial = mine ? buyerInitial : (product.seller.logo || m.seller_name.charAt(0).toUpperCase());

              return (
                <div key={m.id}>
                  {showDaySeparator && (
                    <div className="flex justify-center my-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary rounded-full px-3 py-1">
                        {formatDayLabel(m.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"} ${isLastOfRun ? "mb-2" : "mb-0.5"}`}>
                    {!mine && (
                      <div className={`h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-sm shrink-0 self-end ${isLastOfRun ? "" : "invisible"}`}>
                        {avatarInitial}
                      </div>
                    )}
                    <div className={`flex flex-col ${mine ? "items-end" : "items-start"} max-w-[75%]`}>
                      {showHeader && (
                        <p className={`text-[11px] font-semibold text-muted-foreground mb-1 ${mine ? "pr-1" : "pl-1"}`}>
                          {senderName}
                        </p>
                      )}
                      <div
                        className={`px-4 py-2.5 text-sm leading-snug shadow-sm ${
                          mine
                            ? `bg-primary text-primary-foreground rounded-2xl ${isLastOfRun ? "rounded-br-md" : ""}`
                            : `bg-card border border-border text-foreground rounded-2xl ${isLastOfRun ? "rounded-bl-md" : ""}`
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      </div>
                      {isLastOfRun && (
                        <p className={`text-[10px] text-muted-foreground mt-1 ${mine ? "pr-1" : "pl-1"}`}>
                          {formatTime(m.created_at)}
                        </p>
                      )}
                    </div>
                    {mine && (
                      <div className={`h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0 self-end ${isLastOfRun ? "" : "invisible"}`}>
                        {avatarInitial}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        {userId && (
          <div className="fixed bottom-[52px] left-0 right-0 max-w-md mx-auto bg-card border-t border-border px-3 py-2.5 z-40 safe-bottom">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Message ${product.seller.name}…`}
                rows={1}
                className="flex-1 min-h-[44px] max-h-32 text-sm resize-none rounded-2xl bg-background px-4 py-3 leading-snug"
              />
              <Button
                type="button"
                size="icon"
                className="h-11 w-11 rounded-full shrink-0"
                disabled={!draft.trim() || sending}
                onClick={handleSend}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default MessageThread;

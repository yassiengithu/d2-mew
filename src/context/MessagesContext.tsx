import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  product_id: number;
  seller_name: string;
  buyer_id: string;
  sender: "buyer" | "seller";
  body: string;
  created_at: string;
}

interface MessagesContextType {
  userId: string | null;
  messages: Message[];
  loading: boolean;
  sendMessage: (productId: number, sellerName: string, body: string) => Promise<boolean>;
  getThread: (productId: number) => Message[];
  refresh: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) {
      setMessages(data as Message[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: keep the thread in sync across tabs/devices.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("messages-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `buyer_id=eq.${userId}` },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as Message;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const sendMessage = useCallback(
    async (productId: number, sellerName: string, body: string) => {
      const trimmed = body.trim();
      if (!userId || !trimmed || trimmed.length > 2000) return false;

      const { error } = await supabase.from("messages").insert({
        product_id: productId,
        seller_name: sellerName,
        buyer_id: userId,
        sender: "buyer",
        body: trimmed,
      });
      if (error) return false;

      return true;
    },
    [userId],
  );

  const getThread = useCallback(
    (productId: number) =>
      messages
        .filter((m) => m.product_id === productId)
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1)),
    [messages],
  );

  return (
    <MessagesContext.Provider value={{ userId, messages, loading, sendMessage, getThread, refresh }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
};

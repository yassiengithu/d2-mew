import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Undo2,
  MessageCircle,
  Package,
  CreditCard,
  Info,
  ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useNotifications, type Notification } from "@/context/NotificationsContext";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";

type Filter = "all" | "unread";

// Map a notification type to an icon + color token. Keeps unknown types safe.
const typeMeta = (type: string) => {
  switch (type) {
    case "message":
      return { Icon: MessageCircle, tint: "bg-primary/10 text-primary" };
    case "order":
      return { Icon: Package, tint: "bg-accent text-accent-foreground" };
    case "payment":
      return { Icon: CreditCard, tint: "bg-secondary text-secondary-foreground" };
    default:
      return { Icon: Info, tint: "bg-muted text-muted-foreground" };
  }
};

const groupKey = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return "Earlier";
};

const Notifications = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    remove,
  } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.read) : notifications),
    [filter, notifications],
  );

  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    for (const n of visible) {
      const k = groupKey(n.created_at);
      (groups[k] ||= []).push(n);
    }
    // preserve a stable section order
    return (["Today", "Yesterday", "Earlier"] as const)
      .filter((k) => groups[k]?.length)
      .map((k) => [k, groups[k]] as const);
  }, [visible]);

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        backTo="/"
        trailing={
          unreadCount > 0 ? (
            <button
              onClick={markAllAsRead}
              aria-label="Mark all as read"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground/90 px-2 py-1 rounded-md active:bg-primary-foreground/10"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : undefined
        }
      />

      {/* Filter segmented control */}
      <div className="px-3 pt-3">
        <div
          role="tablist"
          aria-label="Filter notifications"
          className="inline-flex w-full rounded-lg bg-muted p-1 text-xs font-medium"
        >
          {(["all", "unread"] as const).map((f) => {
            const active = filter === f;
            const label = f === "all" ? "All" : "Unread";
            const count = f === "unread" ? unreadCount : notifications.length;
            return (
              <button
                key={f}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-md py-1.5 transition-colors ${
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] ${
                      active ? "bg-primary/10 text-primary" : "bg-background/60 text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 space-y-4">
        {loading ? (
          <div className="space-y-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3 flex gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="h-2.5 w-full rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
            description={
              filter === "unread"
                ? "You're all caught up. Switch to All to see past alerts."
                : "You'll see updates about your messages and orders here."
            }
          />
        ) : (
          grouped.map(([section, items]) => (
            <section key={section} aria-label={section} className="space-y-2">
              <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {section}
              </h2>
              <ul className="space-y-2">
                {items.map((n) => {
                  const { Icon, tint } = typeMeta(n.type);
                  const interactive = Boolean(n.link);
                  const Inner = (
                    <>
                      <div
                        className={`relative h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${tint}`}
                      >
                        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                        {!n.read && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`text-sm leading-snug truncate ${
                              n.read ? "font-medium text-foreground" : "font-semibold text-foreground"
                            }`}
                          >
                            {n.title}
                          </p>
                          <time
                            dateTime={n.created_at}
                            className="text-[10px] text-muted-foreground shrink-0 tabular-nums"
                          >
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </time>
                        </div>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                      </div>
                      {interactive && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60 self-center shrink-0" aria-hidden="true" />
                      )}
                    </>
                  );

                  return (
                    <li
                      key={n.id}
                      className={`group rounded-xl border transition-colors ${
                        n.read
                          ? "bg-card border-border"
                          : "bg-accent/40 border-primary/30"
                      }`}
                    >
                      {n.link ? (
                        <Link
                          to={n.link}
                          onClick={() => !n.read && markAsRead(n.id)}
                          className="flex gap-3 p-3 active:bg-secondary/40 rounded-xl"
                        >
                          {Inner}
                        </Link>
                      ) : (
                        <div className="flex gap-3 p-3">{Inner}</div>
                      )}

                      {/* Action row — visually separate, low-emphasis */}
                      <div className="flex items-center justify-end gap-1 px-2 pb-2 -mt-1">
                        {n.read ? (
                          <button
                            onClick={() => markAsUnread(n.id)}
                            aria-label="Mark as unread"
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-md active:bg-secondary"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            Unread
                          </button>
                        ) : (
                          <button
                            onClick={() => markAsRead(n.id)}
                            aria-label="Mark as read"
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-1 rounded-md active:bg-secondary"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Read
                          </button>
                        )}
                        <button
                          onClick={() => remove(n.id)}
                          aria-label="Delete notification"
                          className="inline-flex items-center gap-1 text-[11px] text-destructive/80 px-2 py-1 rounded-md active:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;

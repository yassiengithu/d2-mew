/**
 * Locale-stable formatting helpers.
 *
 * Why: The default `Number.prototype.toLocaleString("en-US")` and
 * `Date.prototype.toLocaleString("en-US")` use the runtime's locale, which differs
 * between the SSR worker (typically `en-US`) and a client browser (e.g.
 * `en-PH`, `de-DE`). That mismatch causes React hydration error #418 because
 * the server-rendered HTML doesn't match what React renders on the client.
 *
 * Always use these helpers for any number/date that is rendered into JSX.
 */

const NUMBER_LOCALE = "en-US";

export const formatNumber = (n: number | null | undefined): string => {
  const value = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return value.toLocaleString(NUMBER_LOCALE);
};

export const formatDate = (
  iso: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(
    NUMBER_LOCALE,
    options ?? { month: "short", day: "numeric", year: "numeric" },
  );
};

export const formatDateTime = (
  iso: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(
    NUMBER_LOCALE,
    options ?? {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

export const formatTime = (
  iso: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(
    NUMBER_LOCALE,
    options ?? { hour: "2-digit", minute: "2-digit" },
  );
};

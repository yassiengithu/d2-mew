import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lightweight skeleton shown while a lazy-loaded route chunk resolves.
 * Mirrors the shared shell (header strip + content blocks) so layout
 * stays stable when the real page mounts.
 */
const RoutePageSkeleton = () => (
  <div
    className="relative mx-auto min-h-screen max-w-md bg-background"
    role="status"
    aria-label="Loading page"
  >
    <Skeleton className="h-14 w-full rounded-none" />
    <div className="space-y-4 p-4">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
    <span className="sr-only">Loading…</span>
  </div>
);

export default RoutePageSkeleton;

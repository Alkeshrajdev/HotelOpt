import { cn } from "@/lib/utils";

/** A single loading placeholder block. Size it with height and width classes. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-ink-100", className)} aria-hidden />;
}

/**
 * Content-area placeholder shown while a page chunk (or its data) loads — the shell
 * stays put and the page's *shape* appears immediately: header, tab row, KPI row, body.
 * A structured placeholder reads as "arriving"; a lone spinner reads as "stuck".
 */
export function PageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-label="Loading page">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-96 max-w-full rounded-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl2" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl2" />
    </div>
  );
}

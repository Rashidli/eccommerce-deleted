import { cn } from "@/lib/utils";
import { PRODUCT_GRID_CLASS, PRODUCT_GRID_SKELETON_COUNT } from "@/lib/ui/grid";

// Yüklənmə skeleti — shimmer blok
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

// Məhsul kartı skeleti
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

// Məhsul grid skeleti — sütun sayı NƏTİCƏ şəbəkəsi ilə EYNİ mənbədən gəlir,
// əks halda yüklənmə bitəndə düzülüş sıçrayır.
export function ProductGridSkeleton({
  count = PRODUCT_GRID_SKELETON_COUNT,
}: {
  count?: number;
}) {
  return (
    <div className={PRODUCT_GRID_CLASS}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * TƏK məhsul səhifəsinin skeleti — qalereya + məlumat sütunu.
 * `products/loading.tsx` alt seqmentlərə də şamil olunduğu üçün detal
 * səhifəsində siyahı skeleti görünürdü; bu onu əvəz edir.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Skeleton className="mb-6 h-4 w-64" />

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Qalereya — thumb-lar SOLDA (real səhifə ilə eyni düzülüş,
              əks halda yüklənmə bitəndə şəkillər aşağıdan sola tullanır). */}
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="order-2 flex shrink-0 gap-3 md:order-1 md:w-20 md:flex-col">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-20 shrink-0 rounded-lg" />
              ))}
            </div>
            <Skeleton className="order-1 aspect-square min-w-0 flex-1 rounded-2xl md:order-2" />
          </div>

          {/* Məlumat */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-32" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-20" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-14 rounded-lg" />
                ))}
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="space-y-2 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bütöv səhifə skeleti (loading.tsx üçün)
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="mb-6 h-4 w-32" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

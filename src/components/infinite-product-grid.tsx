"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductGrid } from "@/components/product-grid";
import type { ProductDTO } from "@/lib/data/catalog";

/**
 * Sonsuz scroll ilə məhsul şəbəkəsi — `/sale`, `/deals`, `/new`, `/brands`.
 *
 * Server YALNIZ ilk səhifəni göndərir, qalanı `/api/search` ilə gəlir.
 * `PAGE_SIZE` server tərəfi ilə EYNİ olmalıdır — fərqli olsa scroll ya məhsul
 * atlayır, ya təkrar göstərir.
 */
const PAGE_SIZE = 20;

export function InfiniteProductGrid({
  initial,
  /** `/api/search`-ə göndərilən əlavə parametrlər (list, platform, brand…). */
  params,
}: {
  initial: ProductDTO[];
  params: Record<string, string | undefined>;
}) {
  const [extra, setExtra] = useState<ProductDTO[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length >= PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Parametrlər dəyişəndə (məs. brend seçimi) siyahı sıfırdan başlayır.
  const key = JSON.stringify(params);
  useEffect(() => {
    setExtra([]);
    setPage(1);
    setHasMore(initial.length >= PAGE_SIZE);
  }, [key, initial]);

  const products = useMemo(() => [...initial, ...extra], [initial, extra]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const qs = new URLSearchParams({ page: String(next) });
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }

      const res = await fetch(`/api/search?${qs.toString()}`);
      const data: { products?: ProductDTO[]; hasMore?: boolean } =
        await res.json();
      const incoming = data.products ?? [];

      setExtra((prev) => {
        // Eyni məhsul iki dəfə görünməsin.
        const seen = new Set([...initial, ...prev].map((p) => p.id));
        return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
      setHasMore(Boolean(data.hasMore));
    } catch {
      // Şəbəkə xətasında dayanırıq — sonsuz təkrar sorğu olmasın.
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, params, initial]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px" }, // ekrana çatmamış qabaqcadan yüklə
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore]);

  return (
    <>
      <ProductGrid products={products} />

      {hasMore && products.length > 0 && (
        <div ref={sentinelRef} className="flex justify-center py-10">
          <span
            aria-hidden
            className={`h-7 w-7 rounded-full border-2 border-brand/25 border-t-brand ${
              loading ? "animate-spin" : "opacity-40"
            }`}
          />
        </div>
      )}
    </>
  );
}

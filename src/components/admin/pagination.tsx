import Link from "next/link";

/**
 * SƏHİFƏLƏMƏ — bütün admin siyahıları üçün tək komponent.
 *
 * Eyni blok dörd səhifədə təkrarlanırdı; beşincidə ortaqlaşdırıldı. Mövcud
 * süzgəclər (`params`) saxlanılır — əks halda "növbəti səhifə" filtri
 * sıfırlayır və operator axtardığını itirir.
 */
export function Pagination({
  page,
  pages,
  basePath,
  params = {},
}: {
  page: number;
  pages: number;
  basePath: string;
  /** Saxlanacaq cari süzgəclər — boş dəyərlər özü atılır. */
  params?: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;

  const href = (next: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (next > 1) sp.set("page", String(next));
    const q = sp.toString();
    return q ? `${basePath}?${q}` : basePath;
  };

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Səhifə {page} / {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={href(page - 1)}
            className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary"
          >
            Əvvəlki
          </Link>
        )}
        {page < pages && (
          <Link
            href={href(page + 1)}
            className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary"
          >
            Növbəti
          </Link>
        )}
      </div>
    </div>
  );
}

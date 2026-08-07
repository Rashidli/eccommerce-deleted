"use client";

import type { HomeCategoryDTO } from "@/lib/data/catalog";
import { useLang } from "@/context/lang-context";
import { CategoryTile } from "@/components/category-tile";
import { useCategoryList } from "@/lib/use-category-list";
import { SHOW_PLATFORM_UI } from "@/lib/platform-visibility";

/**
 * Kateqoriya səhifəsinin gridi — ana səhifə ilə EYNİ mənbədən (`useCategoryList`):
 *  - "all"  → bizim daxili kateqoriyalar
 *  - 1688   → platformanın öz ağacı (bütün yuxarı səviyyə kateqoriyalar)
 *  - taobao → Partzona-da kateqoriya endpoint-i yoxdur → aydın mesaj
 */
export function CategoriesGrid({
  categories,
  platformCategories,
}: {
  categories: HomeCategoryDTO[];
  platformCategories?: Record<string, HomeCategoryDTO[]>;
}) {
  const { t } = useLang();
  const { list, isAll, platformName } = useCategoryList(
    categories,
    platformCategories,
  );

  if (list.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">
        {t.sections.noPlatformCategories}
      </p>
    );
  }

  return (
    <>
      {/* Platforma adı göstərilmir (bax `SHOW_PLATFORM_UI`) — yalnız say qalır.
          Platforma seçimi qayıdarsa ad yenidən sətrin əvvəlinə düşür. */}
      {!isAll && (
        <p className="mb-4 text-sm text-muted-foreground">
          {SHOW_PLATFORM_UI ? `${platformName} · ` : ""}
          {list.length}
        </p>
      )}

      {/* Ana səhifə ilə EYNİ kart komponenti — forma/ölçü/fon fərqlənmir */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((c) => (
          <CategoryTile key={c.key} category={c} />
        ))}
      </div>
    </>
  );
}

"use client";

import type { HomeCategoryDTO } from "@/lib/data/catalog";
import { useLang } from "@/context/lang-context";
import { CategoryTile } from "@/components/category-tile";
import { useCategoryList } from "@/lib/use-category-list";
import { SectionHeading } from "./section-heading";
import { SHOW_PLATFORM_UI } from "@/lib/platform-visibility";

/**
 * Kateqoriyalar seçilmiş platformaya görə dəyişir:
 *  - "all"  → bizim daxili kateqoriyalar (Category)
 *  - 1688   → platformanın öz ağacı (PlatformCategory)
 *  - taobao → Partzona-da kateqoriya endpoint-i yoxdur → aydın mesaj
 */
export function CategoriesSection({
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

  return (
    <section>
      <SectionHeading
        // Platforma adı başlığa yazılmır: müştəri tədarükçünü görməməlidir
        // (bax `SHOW_PLATFORM_UI`). Açılsa yenidən "Kateqoriyalar · X" olur.
        title={
          isAll || !SHOW_PLATFORM_UI
            ? t.sections.categories
            : `${t.sections.categories} · ${platformName}`
        }
        href="/categories"
        linkLabel={t.common.seeAll}
      />

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
          {t.sections.noPlatformCategories}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {list.map((category) => (
            <CategoryTile key={category.key} category={category} />
          ))}
        </div>
      )}
    </section>
  );
}

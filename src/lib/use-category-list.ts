"use client";

import { useSearch, ALL_PLATFORMS } from "@/context/search-context";
import type { HomeCategoryDTO } from "@/lib/data/catalog";

/**
 * Seçilmiş platformaya görə kateqoriya siyahısı — hər üç səth (header bar,
 * masaüstü home, mobil home) eyni məntiqi işlətsin deyə tək yerdə saxlanır.
 *  - "all"  → bizim daxili kateqoriyalar (Category)
 *  - 1688   → platformanın öz ağacı (PlatformCategory)
 *  - taobao → Partzona-da kateqoriya endpoint-i yoxdur → boş siyahı
 */
export function useCategoryList(
  categories: HomeCategoryDTO[],
  platformCategories?: Record<string, HomeCategoryDTO[]>,
) {
  const { platform, platforms } = useSearch();

  const isAll = platform === ALL_PLATFORMS;
  const list = isAll ? categories : platformCategories?.[platform] ?? [];
  const platformName =
    platforms.find((p) => p.key === platform)?.name ?? platform;

  return { list, isAll, platform, platformName };
}

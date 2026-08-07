"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tag } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { getCategoryIcon } from "@/lib/category-icon";
import { useCategoryList } from "@/lib/use-category-list";
import type { HomeCategoryDTO } from "@/lib/data/catalog";

/**
 * Header-in alt zolağı — kateqoriyalar DB-dən gəlir (qayda #4) və seçilmiş
 * platformaya görə dəyişir (home səhifəsi ilə eyni `useCategoryList` məntiqi).
 */
export function CategoryBar({
  categories,
  platformCategories,
  platformSubcategories,
}: {
  categories: HomeCategoryDTO[];
  platformCategories?: Record<string, HomeCategoryDTO[]>;
  /** { platformaAçarı: { valideynId: alt kateqoriyalar } } — DB-dən gələn ağac. */
  platformSubcategories?: Record<string, Record<string, HomeCategoryDTO[]>>;
}) {
  const { t } = useLang();
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { list, isAll, platform } = useCategoryList(
    categories,
    platformCategories,
  );

  // Artıq HƏR İKİ halda dropdown var → masaüstündə kəsilməsin.
  // Mobildə yer azdır, zolaq üfüqi sürüşür (dropdown onsuz da toxunuşla açılmır).
  const overflow = "overflow-x-auto scrollbar-hide md:overflow-x-visible";

  return (
    <div className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-4">
        <ul className={`flex items-center gap-1 py-2 text-sm ${overflow}`}>
          {list.map((category) => {
            const Icon = getCategoryIcon(category.key, category.name, category.nameEn);
            // Alt kateqoriyalar YALNIZ platforma ağacından gəlir (DB — qayda #4).
            // "Hamısı" rejimində dropdown yoxdur: əvvəl statik JSON-dan gələn
            // linklər valideynin məhsullarını başqa başlıq altında göstərirdi,
            // yəni saxta filtr idi.
            const subs: { key: string; label: string; href: string }[] = isAll
              ? []
              : (platformSubcategories?.[platform]?.[category.key] ?? []).map(
                  (s) => ({ key: s.key, label: s.name, href: s.href }),
                );
            // Sorğu parametrli linklərdə (platforma kateqoriyaları) aktivlik seçilmir —
            // əks halda hamısı /products-a uyğun gəlib aktiv görünərdi.
            const active =
              !category.href.includes("?") && pathname === category.href;

            return (
              <li
                key={category.key}
                className="relative shrink-0"
                onMouseEnter={() => setOpenKey(category.key)}
                onMouseLeave={() => setOpenKey(null)}
              >
                <Link
                  href={category.href}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors ${
                    active || openKey === category.key
                      ? "bg-brand/10 text-brand"
                      : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {category.name}
                </Link>

                {/* Alt-kateqoriya dropdown-u */}
                {openKey === category.key && subs.length > 0 && (
                  <div
                    className={`absolute left-0 top-full z-50 max-h-[75vh] overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-xl ${
                      // Sütun sayı alt kateqoriya sayına görə: az olanda dar
                      // qalsın, çox olanda yan-yana yerləşsin (əvvəl hamısı tək
                      // dar sütunda idi və uzun siyahılar görünmürdü).
                      subs.length > 24
                        ? "w-[46rem] columns-4"
                        : subs.length > 12
                          ? "w-[34rem] columns-3"
                          : subs.length > 6
                            ? "w-[23rem] columns-2"
                            : "w-[13rem] columns-1"
                    } gap-3`}
                  >
                    {subs.map((s) => (
                      <Link
                        key={s.key}
                        href={s.href}
                        className="block break-inside-avoid truncate rounded-lg px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-brand"
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}

          {/* Endirim — kataloq kateqoriyası deyil, ayrıca səth */}
          <li className="relative shrink-0">
            <Link
              href="/sale"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors ${
                pathname === "/sale"
                  ? "bg-brand/10 text-brand"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Tag className="h-4 w-4" />
              {t.cat.sale}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

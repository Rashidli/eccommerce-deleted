"use client";

import Image from "next/image";
import Link from "next/link";
import type { HomeCategoryDTO } from "@/lib/data/catalog";
import { getCategoryIcon } from "@/lib/category-icon";

/**
 * ORTAQ kateqoriya kartı — ana səhifə və /categories eyni komponenti işlədir,
 * ona görə forma/ölçü/fon heç vaxt ayrıla bilməz.
 * Dizayn: TAM DAİRƏVİ badge (kvadrat kart yoxdur), şəkillər şəffaf fonlu,
 * hover-də dairənin rəngi dəyişir.
 */
export function CategoryTile({ category }: { category: HomeCategoryDTO }) {
  const Icon = getCategoryIcon(category.key, category.name, category.nameEn);

  return (
    <Link
      href={category.href}
      className="group flex flex-col items-center gap-2"
    >
      <span className="relative grid aspect-square w-full max-w-[112px] place-items-center overflow-hidden rounded-full bg-brand/10 text-brand ring-1 ring-border/60 transition-all duration-300 group-hover:bg-brand/20 group-hover:ring-brand/40">
        {category.img ? (
          <Image
            src={category.img}
            alt={category.name}
            fill
            sizes="112px"
            className="object-contain p-3 transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Icon className="h-7 w-7" />
        )}
      </span>

      <span className="w-full truncate text-center text-xs font-medium text-foreground/80 transition-colors group-hover:text-brand sm:text-sm">
        {category.name}
      </span>
    </Link>
  );
}

import type { ProductVariantsDTO } from "../variants";

/**
 * Adapterin gördüyü xam giriş — Prisma modelindən ASILI DEYİL, sadəcə lazım olan
 * sahələr. Beləliklə adapterləri test etmək və yeni platforma əlavə etmək asandır.
 */
export type VariantSourceInput = {
  /** `Product.source`: "1688" | "taobao" | ... */
  source: string | null;
  /** Normalize olunmuş platforma məlumatı (`Product.attributes` JSONB). */
  attributes: unknown;
  /** Platformanın toxunulmamış cavabı (`Product.raw` JSONB) — ehtiyat mənbə. */
  raw: unknown;
  /** Məhsulun ümumi şəkilləri — variant şəkli yoxdursa geri düşmək üçün. */
  images: string[];
  /** Məhsulun baza qiyməti (sent) — variant qiyməti yoxdursa. */
  priceCents: number;
  minOrderQty: number;
};

/** Hər platforma bunu implementasiya edir. Heç vaxt exception atmamalıdır. */
export type VariantAdapter = (input: VariantSourceInput) => ProductVariantsDTO;

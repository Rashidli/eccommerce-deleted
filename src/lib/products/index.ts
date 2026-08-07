import { emptyVariants, type ProductVariantsDTO } from "./variants";
import type { VariantAdapter, VariantSourceInput } from "./adapters/types";
import { adapter1688 } from "./adapters/1688";
import { adapterTaobao } from "./adapters/taobao";
import { adapterZara } from "./adapters/zara";

// Platforma → adapter reyestri (qayda #6).
// Yeni platforma əlavə etmək üçün: adapter yaz + bura bir sətir. UI dəyişmir.
const ADAPTERS: Record<string, VariantAdapter> = {
  "1688": adapter1688,
  taobao: adapterTaobao,
  zara: adapterZara,
};

/**
 * Məhsulun variantlarını ORTAQ şəklə çevirir.
 * Tanınmayan mənbə (seed məhsulları, yeni platforma) → boş, amma etibarlı nəticə;
 * heç vaxt exception atmır, çünki məhsul səhifəsi variantsız da açılmalıdır.
 */
export function getVariants(input: VariantSourceInput): ProductVariantsDTO {
  const adapter = input.source ? ADAPTERS[input.source] : undefined;
  if (!adapter) return emptyVariants(input.source ?? "unknown");

  try {
    return adapter(input);
  } catch {
    // Platforma cavabının forması gözlənilmədən dəyişsə belə səhifə açılsın.
    return emptyVariants(input.source ?? "unknown");
  }
}

export type { VariantAdapter, VariantSourceInput } from "./adapters/types";
export * from "./variants";

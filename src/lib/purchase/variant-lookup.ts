import "server-only";
import { classifyAxis } from "@/lib/products/variants";

/**
 * SKU → ÖLÇÜ, RƏNG və RƏNGƏ UYĞUN MƏHSUL LİNKİ.
 *
 * NİYƏ LAZIMDIR — iki səbəb, ikisi də canlı sınaqda ortaya çıxdı:
 *
 * 1) Zara-nın `cart/add` endpointi ölçünün ADINI istəyir ("L(43-46)"),
 *    sifarişdə isə platformanın SKU-su saxlanılır.
 *
 * 2) ZARA-DA RƏNG URL-İN İÇİNDƏDİR. Məhsulun ümumi linki default rəngi açır;
 *    müştəri başqa rəng seçibsə `cart/add` `color_mismatch` qaytarır və heç nə
 *    əlavə etmir. Ölçülmüş nümunə: istənilən "Gris", səhifədə "BLANCO" →
 *    əlavə edilmədi. Ona görə rəngə uyğun `?v1=...` linki lazımdır.
 *
 * ƏSAS MƏNBƏ `raw.colors[]`-dir: hər rəngin öz URL-i və `sizes[]` massivi var,
 * hər ölçüdə isə bizim saxladığımız SKU. Yəni SKU → (rəng, ölçü, link) uyğunluğu
 * birmənalıdır və uydurma tələb etmir.
 *
 * `attributes.variants` ehtiyat yoldur (ad etiketlərini verir, linki yox).
 */

export type VariantLabels = {
  size: string | null;
  color: string | null;
  /** Rəngə uyğun məhsul linki — yoxdursa çağıran ümumi `sourceUrl`-a düşür. */
  url: string | null;
};

const EMPTY: VariantLabels = { size: null, color: null, url: null };

type RawSize = { sku?: unknown; name?: unknown; url?: unknown };
type RawColor = { name?: unknown; url?: unknown; sizes?: unknown };
type RawOption = { name?: unknown; value?: unknown };
type RawVariant = { skuId?: unknown; options?: unknown };

/** `raw.colors[].sizes[].sku` üzrə dəqiq uyğunluq. */
function fromRawColors(raw: unknown, sku: string): VariantLabels | null {
  const colors = (raw as { colors?: unknown } | null)?.colors;
  if (!Array.isArray(colors)) return null;

  for (const c of colors as RawColor[]) {
    if (!Array.isArray(c?.sizes)) continue;
    for (const sz of c.sizes as RawSize[]) {
      if (String(sz?.sku ?? "") !== sku) continue;
      return {
        size: typeof sz.name === "string" ? sz.name : null,
        color: typeof c.name === "string" ? c.name : null,
        // Ölçü səviyyəsindəki link daha dəqiqdir; yoxdursa rəngin linki.
        url:
          (typeof sz.url === "string" && sz.url) ||
          (typeof c.url === "string" && c.url) ||
          null,
      };
    }
  }
  return null;
}

/** `attributes.variants[].options[]` — yalnız etiketlər (link yoxdur). */
function fromVariants(attributes: unknown, sku: string): VariantLabels | null {
  const variants = (attributes as { variants?: unknown } | null)?.variants;
  if (!Array.isArray(variants)) return null;

  const match = (variants as RawVariant[]).find(
    (v) => String(v?.skuId ?? "") === sku,
  );
  if (!match || !Array.isArray(match.options)) return null;

  let size: string | null = null;
  let color: string | null = null;

  for (const opt of match.options as RawOption[]) {
    const name = typeof opt?.name === "string" ? opt.name : "";
    const value = typeof opt?.value === "string" ? opt.value.trim() : "";
    if (!name || !value) continue;

    // Ox adı platformadan asılıdır ("Size" / "尺码" / "Ölçü") — təsnifat
    // ortaq helper ilə edilir, kodda sabit ad siyahısı saxlanmır.
    const kind = classifyAxis(name);
    if (kind === "size" && !size) size = value;
    else if (kind === "color" && !color) color = value;
  }

  return { size, color, url: null };
}

export function variantLabelsFromSku(
  attributes: unknown,
  raw: unknown,
  sku: string | null | undefined,
): VariantLabels {
  if (!sku) return EMPTY;
  const key = String(sku);
  return fromRawColors(raw, key) ?? fromVariants(attributes, key) ?? EMPTY;
}

// Platformadan ASILI OLMAYAN variant modeli (qayda #6).
//
// 1688, Taobao və gələcək platformalar variantları tamam fərqli formada qaytarır.
// Hər platformanın öz adapteri var (`./adapters/*`), hamısı BURADAKI ortaq şəklə
// çevirir — UI heç vaxt məhsulun hansı platformadan gəldiyini bilmək məcburiyyətində
// deyil. Bu fayl React-dən və Prisma-dan asılı deyil: həm serverdə, həm client-də
// təhlükəsiz işlədilir (client komponentə prop kimi ötürülür).

/** Bir oxun (rəng/ölçü/...) mümkün dəyəri. */
export type VariantOptionValueDTO = {
  /** Platformadakı xam dəyər — variantları uyğunlaşdırmaq üçün açar. */
  value: string;
  /** İstifadəçiyə göstərilən mətn. */
  label: string;
  /** Bu dəyər üçün şəkil (1688 rəng seçimlərində verir) — rəng seçiləndə qalereya buna keçir. */
  image?: string;
  /** Həqiqi hex rəng — platforma vermirsə UNDEFINED qalır (uydurmuruq). */
  swatch?: string;
};

/** Variant oxu: rəng, ölçü və ya platformanın verdiyi hər hansı digər ölçü. */
export type VariantAxisDTO = {
  /** Sabit açar (slug) — `optionValues` bunun üzərindən oxunur. */
  key: string;
  /** Başlıq (platformadan gələn ad). */
  label: string;
  /** UI-ın necə göstərəcəyini bilməsi üçün: rəng → şəkilli düymə, ölçü → mətn düymə. */
  kind: "color" | "size" | "other";
  values: VariantOptionValueDTO[];
};

/** Konkret SKU — bütün oxlar üzrə bir kombinasiya. */
export type ProductVariantDTO = {
  /** Platformadakı SKU/spec identifikatoru. */
  id: string;
  /** { oxAçarı: dəyər } — `VariantAxisDTO.values[].value` ilə uyğun gəlir. */
  optionValues: Record<string, string>;
  priceCents: number;
  oldPriceCents?: number;
  stock: number;
  image?: string;
  /** Tədarükçü artikulu (1688 `cargoNumber`) — operator sifariş verəndə lazımdır. */
  sku?: string;
};

export type ProductSpecDTO = { name: string; value: string };

/** Miqdara görə qiymət pilləsi (1688 topdan satış). */
export type PriceTierDTO = { startQuantity: number; priceCents: number };

/** UI-ın gördüyü YEGANƏ variant şəkli — platformadan asılı deyil. */
export type ProductVariantsDTO = {
  axes: VariantAxisDTO[];
  variants: ProductVariantDTO[];
  specs: ProductSpecDTO[];
  minOrderQty: number;
  /** Satış vahidi ("Piece" və s.) — platforma verirsə. */
  unit?: string;
  priceTiers: PriceTierDTO[];
  /** Adapterin datanı tanıyıb-tanımadığı — UI/diaqnostika üçün. */
  source: string;
};

/* ------------------------------ köməkçilər ------------------------------ */

export function emptyVariants(source = "unknown"): ProductVariantsDTO {
  return {
    axes: [],
    variants: [],
    specs: [],
    minOrderQty: 1,
    priceTiers: [],
    source,
  };
}

/** Ox adını sabit açara çevirir: "Color" → "color", "Ana renk" → "ana-renk". */
export function axisKeyOf(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "axis"
  );
}

// Ad əsaslı təsnifat — platformalar oxu ingiliscə, çincə və ya başqa dildə verə bilər.
const COLOR_RE = /colou?r|颜色|色|rəng|renk|цвет/i;
const SIZE_RE = /size|尺码|尺寸|规格|ölçü|beden|размер/i;

export function classifyAxis(name: string): VariantAxisDTO["kind"] {
  if (COLOR_RE.test(name)) return "color";
  if (SIZE_RE.test(name)) return "size";
  return "other";
}

/**
 * Seçimə uyğun gələn ilk variantı tapır.
 * Yarımçıq seçim (məs. yalnız rəng) verilibsə, ona uyğun İLK variant qayıdır —
 * beləliklə qiymət/şəkil dərhal yenilənir, istifadəçi ölçünü sonra seçir.
 *
 * BOŞ seçimdə `undefined` qayıdır. Bu şərt olmasa `[].every()` həmişə `true`
 * verir və funksiya İLK variantı "seçilmiş" kimi qaytarırdı: səhifə açılan
 * kimi heç nə seçmədən konkret SKU-nun qiyməti, stoku və şəkli görünürdü,
 * qalereyada isə thumb-a klik təsirsiz qalırdı.
 */
export function findVariant(
  data: ProductVariantsDTO,
  selection: Record<string, string>,
): ProductVariantDTO | undefined {
  const keys = Object.keys(selection).filter((k) => selection[k]);
  if (keys.length === 0) return undefined;
  return data.variants.find((v) =>
    keys.every((k) => v.optionValues[k] === selection[k]),
  );
}

/**
 * Verilmiş ox dəyəri cari seçimlə birlikdə mövcuddurmu?
 * UI mövcud olmayan kombinasiyaları söndürülmüş göstərsin deyə.
 */
export function isCombinationAvailable(
  data: ProductVariantsDTO,
  selection: Record<string, string>,
  axisKey: string,
  value: string,
): boolean {
  const probe: Record<string, string> = { ...selection, [axisKey]: value };
  // Yalnız DİGƏR oxlardakı seçimlər məhdudlaşdırır (özünü özü ilə kəsmirik).
  return data.variants.some((v) =>
    Object.entries(probe).every(([k, val]) => !val || v.optionValues[k] === val),
  );
}

/**
 * Cari seçim üçün göstəriləcək şəkil:
 * 1) seçilmiş variantın öz şəkli, 2) seçilmiş RƏNG dəyərinin şəkli, 3) yoxdursa undefined.
 */
export function imageForSelection(
  data: ProductVariantsDTO,
  selection: Record<string, string>,
): string | undefined {
  const variant = findVariant(data, selection);
  if (variant?.image) return variant.image;

  for (const axis of data.axes) {
    if (axis.kind !== "color") continue;
    const picked = selection[axis.key];
    if (!picked) continue;
    const value = axis.values.find((v) => v.value === picked);
    if (value?.image) return value.image;
  }
  return undefined;
}

/** Miqdara görə faktiki qiymət (topdan pillələr) — pillə yoxdursa baza qiymət. */
export function priceForQuantity(
  data: ProductVariantsDTO,
  quantity: number,
  basePriceCents: number,
): number {
  const applicable = data.priceTiers
    .filter((t) => quantity >= t.startQuantity)
    .sort((a, b) => b.startQuantity - a.startQuantity)[0];
  return applicable?.priceCents ?? basePriceCents;
}

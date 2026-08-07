import {
  axisKeyOf,
  classifyAxis,
  emptyVariants,
  type PriceTierDTO,
  type ProductSpecDTO,
  type ProductVariantDTO,
  type ProductVariantsDTO,
  type VariantAxisDTO,
  type VariantOptionValueDTO,
} from "../variants";
import { asArray, asNumber, asRecord, asString, pick, toCents } from "../json";
import type { VariantSourceInput } from "./types";

// 1688 (Partzona) adapteri.
//
// Saxlanan real şəkil (`Product.attributes`):
//   { unit, minOrderQuantity, specs:[{name,value}], priceTiers:[{price:"168.0",startQuantity}],
//     variants:[{ skuId, specId, stock, priceCents, cargoNumber,
//                 options:[{ name:"Color", value:"Mud gray", image:"https://..." },
//                          { name:"Size",  value:"XS",       image:null }] }] }
//
// ƏSAS: rəng seçimləri ŞƏKİL daşıyır (canlı datada 1860 seçimin 1854-ü) — rəng
// dəyişəndə qalereyanın dəyişməsi məhz buradan gəlir. Ölçüdə şəkil heç vaxt olmur.
// 1688 hex rəng vermir, ona görə `swatch` doldurulmur (uydurma rəng göstərmirik).

export const adapter1688 = (input: VariantSourceInput): ProductVariantsDTO => {
  const attrs = asRecord(input.attributes);
  if (!attrs) return emptyVariants("1688");

  const rawVariants = asArray(attrs.variants);

  // --- oxlar: variantların `options` massivindən çıxarılır (sıra qorunur) ---
  const axisOrder: string[] = [];
  const axisLabels = new Map<string, string>();
  const axisValues = new Map<string, Map<string, VariantOptionValueDTO>>();

  for (const rawVariant of rawVariants) {
    const variant = asRecord(rawVariant);
    if (!variant) continue;

    for (const rawOption of asArray(variant.options)) {
      const option = asRecord(rawOption);
      const name = asString(option?.name);
      const value = asString(option?.value);
      if (!name || !value) continue;

      const key = axisKeyOf(name);
      if (!axisValues.has(key)) {
        axisOrder.push(key);
        axisLabels.set(key, name);
        axisValues.set(key, new Map());
      }

      const values = axisValues.get(key)!;
      const image = asString(option?.image);
      const existing = values.get(value);
      if (existing) {
        // İlk rastlaşdığımız şəkli saxlayırıq, sonrakı boş dəyər onu silməsin.
        if (!existing.image && image) existing.image = image;
      } else {
        values.set(value, { value, label: value, image });
      }
    }
  }

  const axes: VariantAxisDTO[] = axisOrder.map((key) => ({
    key,
    label: axisLabels.get(key) ?? key,
    kind: classifyAxis(axisLabels.get(key) ?? key),
    values: [...(axisValues.get(key)?.values() ?? [])],
  }));

  // --- variantlar ---
  const variants: ProductVariantDTO[] = [];
  for (const rawVariant of rawVariants) {
    const variant = asRecord(rawVariant);
    if (!variant) continue;

    const optionValues: Record<string, string> = {};
    let image: string | undefined;

    for (const rawOption of asArray(variant.options)) {
      const option = asRecord(rawOption);
      const name = asString(option?.name);
      const value = asString(option?.value);
      if (!name || !value) continue;
      optionValues[axisKeyOf(name)] = value;
      image ??= asString(option?.image);
    }

    const id =
      asString(pick(variant, "skuId", "specId")) ??
      `v${variants.length}`;

    variants.push({
      id,
      optionValues,
      priceCents: asNumber(variant.priceCents) ?? input.priceCents,
      stock: asNumber(variant.stock) ?? 0,
      image,
      sku: asString(variant.cargoNumber),
    });
  }

  // --- spesifikasiyalar ---
  // Oxa çevrilmiş sahələr (Color/Size) siyahıdan çıxarılır: `specs` orada yalnız
  // BİR variantın dəyərini saxlayır və seçicidəki dəyərlə ziddiyyət yaradardı.
  const axisLabelSet = new Set(
    axes.map((a) => a.label.trim().toLowerCase()),
  );
  const specs: ProductSpecDTO[] = [];
  for (const rawSpec of asArray(attrs.specs)) {
    const spec = asRecord(rawSpec);
    const name = asString(spec?.name);
    const value = asString(spec?.value);
    if (!name || !value) continue;
    if (axes.length > 0 && axisLabelSet.has(name.trim().toLowerCase())) continue;
    specs.push({ name, value });
  }

  // --- qiymət pillələri ---
  const priceTiers: PriceTierDTO[] = [];
  for (const rawTier of asArray(attrs.priceTiers)) {
    const tier = asRecord(rawTier);
    const priceCents = toCents(pick(tier, "price", "priceCents"));
    const startQuantity = asNumber(pick(tier, "startQuantity", "quantity"));
    if (priceCents === undefined || startQuantity === undefined) continue;
    priceTiers.push({ startQuantity, priceCents });
  }
  priceTiers.sort((a, b) => a.startQuantity - b.startQuantity);

  return {
    axes,
    variants,
    specs,
    minOrderQty:
      asNumber(pick(attrs, "minOrderQuantity")) ?? input.minOrderQty ?? 1,
    unit: asString(attrs.unit),
    priceTiers,
    source: "1688",
  };
};

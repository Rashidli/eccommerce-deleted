import {
  axisKeyOf,
  classifyAxis,
  emptyVariants,
  type ProductSpecDTO,
  type ProductVariantDTO,
  type ProductVariantsDTO,
  type VariantAxisDTO,
  type VariantOptionValueDTO,
} from "../variants";
import { asArray, asNumber, asRecord, asString, pick } from "../json";
import type { VariantSourceInput } from "./types";

// ZARA adapteri.
//
// `Product.attributes.variants` forması (normalize-də qurulur):
//   variants:[{ skuId, specId, priceCents, oldPriceCents?, stock,
//               options:[{ name:"Color", value:"Negro", image:"https://...", swatch:"#242524" },
//                        { name:"Size",  value:"S",      image:null }] }]
//
// ZARA-nın ÜSTÜNLÜYÜ: rəngin ƏSL hex kodu var (`swatch`) — 1688/Taobao vermir.
// Ona görə rəng düymələri real rəng göstərir; şəkil də rəng oxundadır, seçiləndə
// qalereya dəyişir. Ölçü oxu stok/qiymət daşıyır, şəkil daşımır.

export const adapterZara = (input: VariantSourceInput): ProductVariantsDTO => {
  const attrs = asRecord(input.attributes);
  if (!attrs) return emptyVariants("zara");

  const rawVariants = asArray(attrs.variants);
  if (rawVariants.length === 0) return emptyVariants("zara");

  // --- oxlar (sıra qorunur: Color, sonra Size) ---
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
      const swatch = asString(option?.swatch); // əsl hex — yalnız Zara verir
      const existing = values.get(value);
      if (existing) {
        if (!existing.image && image) existing.image = image;
        if (!existing.swatch && swatch) existing.swatch = swatch;
      } else {
        values.set(value, { value, label: value, image, swatch });
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

    const oldCents = asNumber(variant.oldPriceCents);
    const priceCents = asNumber(variant.priceCents) ?? input.priceCents;

    variants.push({
      id: asString(pick(variant, "skuId", "specId")) ?? `v${variants.length}`,
      optionValues,
      priceCents,
      ...(oldCents !== undefined && oldCents > priceCents
        ? { oldPriceCents: oldCents }
        : {}),
      stock: asNumber(variant.stock) ?? 0,
      image,
      sku: asString(pick(variant, "skuId", "specId")),
    });
  }

  // --- spesifikasiyalar (oxa çevrilmiş sahələr çıxarılır) ---
  const axisLabelSet = new Set(axes.map((a) => a.label.trim().toLowerCase()));
  const specs: ProductSpecDTO[] = [];
  for (const rawSpec of asArray(attrs.specs)) {
    const spec = asRecord(rawSpec);
    const name = asString(spec?.name);
    const value = asString(spec?.value);
    if (!name || !value) continue;
    if (axes.length > 0 && axisLabelSet.has(name.trim().toLowerCase())) continue;
    specs.push({ name, value });
  }

  return {
    axes,
    variants,
    specs,
    minOrderQty: 1, // Zara pərakəndə — minimum sifariş 1.
    unit: undefined,
    priceTiers: [], // Zara topdan pillə vermir.
    source: "zara",
  };
};

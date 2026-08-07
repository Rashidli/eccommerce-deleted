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

// Taobao adapteri.
//
// ⚠️ DOĞRULANMAYIB. Bazadakı 5 Taobao məhsulunun `raw` və `attributes` sahələri
// BOŞDUR — onlar yalnız axtarış siyahısından gəlib, detal normalizeri hələ yazılmayıb.
// Ona görə buradakı məntiq Taobao-nun sənədləşmiş SKU formatına əsaslanır və real
// cavabla YOXLANMAYIB. Gerçək data gələndə `parseTaobaoSkus` yenidən nəzərdən keçirilməlidir.
//
// Dəstəklənən iki forma:
//   A) Taobao klassik SKU: { skuId, price, quantity, propertiesName:
//      "1627207:28320:颜色:黑色;20509:28314:尺码:XL" }  (pid:vid:ad:dəyər, ";" ilə ayrılır)
//   B) 1688-ə bənzər normalize forma: { options:[{name,value,image}] } —
//      gələcək normalizer bu şəkli seçsə, adapter avtomatik işləyəcək.
//
// Hansı forma tanınmasa, BOŞ nəticə qayıdır (exception yox) — səhifə variantsız
// açılır, məhsulun qalan məlumatları normal göstərilir.

type ParsedOption = { name: string; value: string; image?: string };

/** "1627207:28320:颜色:黑色;20509:28314:尺码:XL" → [{name:"颜色",value:"黑色"}, ...] */
function parsePropertiesName(text: string): ParsedOption[] {
  const options: ParsedOption[] = [];
  for (const part of text.split(";")) {
    const segments = part.split(":");
    // pid:vid:ad:dəyər — dəyərin özündə ":" ola bilər, ona görə qalan hissə birləşdirilir.
    if (segments.length < 4) continue;
    const name = segments[2]?.trim();
    const value = segments.slice(3).join(":").trim();
    if (name && value) options.push({ name, value });
  }
  return options;
}

function optionsOf(sku: Record<string, unknown>): ParsedOption[] {
  // B forması — birbaşa normalize olunmuş seçimlər.
  const direct = asArray(sku.options);
  if (direct.length > 0) {
    const parsed: ParsedOption[] = [];
    for (const rawOption of direct) {
      const option = asRecord(rawOption);
      const name = asString(pick(option, "name", "propName"));
      const value = asString(pick(option, "value", "valueName"));
      if (name && value) {
        parsed.push({ name, value, image: asString(pick(option, "image", "imageUrl")) });
      }
    }
    if (parsed.length > 0) return parsed;
  }

  // A forması — Taobao-nun mətn kodlaşdırması.
  const propertiesName = asString(
    pick(sku, "propertiesName", "properties_name", "propsName"),
  );
  return propertiesName ? parsePropertiesName(propertiesName) : [];
}

export const adapterTaobao = (input: VariantSourceInput): ProductVariantsDTO => {
  const attrs = asRecord(input.attributes);
  const raw = asRecord(input.raw);

  const skuList = [
    ...asArray(pick(attrs, "variants", "skus", "skuList")),
    ...asArray(pick(raw, "skus", "skuList", "sku_list")),
  ];
  if (skuList.length === 0) return emptyVariants("taobao");

  const axisOrder: string[] = [];
  const axisLabels = new Map<string, string>();
  const axisValues = new Map<string, Map<string, VariantOptionValueDTO>>();
  const variants: ProductVariantDTO[] = [];

  // Rəng şəkilləri Taobao-da adətən SKU-da yox, ayrıca `propImages` xəritəsində gəlir.
  const propImages = asRecord(pick(attrs, "propImages", "propImgs"));

  for (const rawSku of skuList) {
    const sku = asRecord(rawSku);
    if (!sku) continue;

    const options = optionsOf(sku);
    if (options.length === 0) continue;

    const optionValues: Record<string, string> = {};
    let image: string | undefined;

    for (const option of options) {
      const key = axisKeyOf(option.name);
      if (!axisValues.has(key)) {
        axisOrder.push(key);
        axisLabels.set(key, option.name);
        axisValues.set(key, new Map());
      }

      const resolvedImage =
        option.image ?? asString(propImages?.[option.value]);
      const values = axisValues.get(key)!;
      const existing = values.get(option.value);
      if (existing) {
        if (!existing.image && resolvedImage) existing.image = resolvedImage;
      } else {
        values.set(option.value, {
          value: option.value,
          label: option.value,
          image: resolvedImage,
        });
      }

      optionValues[key] = option.value;
      image ??= resolvedImage;
    }

    variants.push({
      id:
        asString(pick(sku, "skuId", "sku_id", "id")) ?? `v${variants.length}`,
      optionValues,
      // Taobao qiyməti adətən yuan mətnidir; sent gəlirsə də düzgün oxunur.
      priceCents:
        toCents(pick(sku, "price", "promotionPrice")) ??
        asNumber(sku.priceCents) ??
        input.priceCents,
      stock: asNumber(pick(sku, "quantity", "stock")) ?? 0,
      image,
      sku: asString(pick(sku, "outerId", "cargoNumber")),
    });
  }

  const axes: VariantAxisDTO[] = axisOrder.map((key) => ({
    key,
    label: axisLabels.get(key) ?? key,
    kind: classifyAxis(axisLabels.get(key) ?? key),
    values: [...(axisValues.get(key)?.values() ?? [])],
  }));

  const axisLabelSet = new Set(axes.map((a) => a.label.trim().toLowerCase()));
  const specs: ProductSpecDTO[] = [];
  for (const rawSpec of asArray(pick(attrs, "specs", "props", "attributes"))) {
    const spec = asRecord(rawSpec);
    const name = asString(pick(spec, "name", "propName"));
    const value = asString(pick(spec, "value", "valueName"));
    if (!name || !value) continue;
    if (axes.length > 0 && axisLabelSet.has(name.trim().toLowerCase())) continue;
    specs.push({ name, value });
  }

  const priceTiers: PriceTierDTO[] = [];
  for (const rawTier of asArray(pick(attrs, "priceTiers", "priceRanges"))) {
    const tier = asRecord(rawTier);
    const priceCents = toCents(pick(tier, "price", "priceCents"));
    const startQuantity = asNumber(pick(tier, "startQuantity", "quantity", "begin"));
    if (priceCents === undefined || startQuantity === undefined) continue;
    priceTiers.push({ startQuantity, priceCents });
  }
  priceTiers.sort((a, b) => a.startQuantity - b.startQuantity);

  return {
    axes,
    variants,
    specs,
    minOrderQty:
      asNumber(pick(attrs, "minOrderQuantity", "minOrder")) ??
      input.minOrderQty ??
      1,
    unit: asString(pick(attrs, "unit")),
    priceTiers,
    source: "taobao",
  };
};

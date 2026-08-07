import "server-only";

/**
 * 1688 `productShippingInfo` içindən ÖLÇÜLƏN çəkini çıxarır.
 *
 * Real struktur (bazadan yoxlanılıb, 486/1104 məhsulda var):
 *   productShippingInfo: {
 *     skuShippingDetails:  [{ skuId, weight(kq), officialWeight?, pkgSizeSource }],
 *     skuShippingInfoList: [{ skuId, specId, weight(QRAM) }],
 *     sendGoodsAddressText: "浙江省杭州市",
 *   }
 *
 * DİQQƏT — iki siyahıda çəki VAHİDİ FƏRQLİDİR:
 *   · `skuShippingDetails.weight`  → kiloqram (0.025 = 25 q)
 *   · `skuShippingInfoList.weight` → qram (25 = 25 q)
 * Onları qarışdırmaq çəkini 1000 dəfə səhv göstərir.
 *
 * `pkgSizeSource: 商家自填` ("satıcı özü doldurub") çox vaxt 0 gəlir — ona görə
 * varsa `officialWeight` (platformanın öz ölçüsü) üstün tutulur.
 */

type ShippingDetail = {
  skuId?: unknown;
  weight?: unknown;
  officialWeight?: unknown;
};

type ShippingInfo = {
  skuId?: unknown;
  weight?: unknown;
};

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Bir SKU üçün çəki (qram). Tapılmasa `null` — uydurma dəyər qaytarılmır.
 * `skuId` verilməsə məhsulun ilk mövcud çəkisi götürülür.
 */
export function weightGramsFor1688(raw: unknown, skuId?: string): number | null {
  if (!raw || typeof raw !== "object") return null;
  const info = (raw as { productShippingInfo?: unknown }).productShippingInfo;
  if (!info || typeof info !== "object") return null;

  const details = (info as { skuShippingDetails?: unknown }).skuShippingDetails;
  const list = (info as { skuShippingInfoList?: unknown }).skuShippingInfoList;

  // 1) `skuShippingDetails` — kiloqramla, `officialWeight` daha etibarlıdır.
  if (Array.isArray(details)) {
    const match = skuId
      ? (details as ShippingDetail[]).find((d) => String(d.skuId ?? "") === skuId)
      : undefined;
    for (const d of match ? [match] : (details as ShippingDetail[])) {
      const kg = num(d.officialWeight) ?? num(d.weight);
      if (kg != null) return Math.round(kg * 1000);
    }
  }

  // 2) `skuShippingInfoList` — artıq qramladır, çevirmə YOXDUR.
  if (Array.isArray(list)) {
    const match = skuId
      ? (list as ShippingInfo[]).find((d) => String(d.skuId ?? "") === skuId)
      : undefined;
    for (const d of match ? [match] : (list as ShippingInfo[])) {
      const g = num(d.weight);
      if (g != null) return Math.round(g);
    }
  }

  return null;
}

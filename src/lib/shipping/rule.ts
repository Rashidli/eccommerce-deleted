import "server-only";
import { prisma } from "@/lib/prisma";
import type { ShippingArgs, ShippingBasis, ShippingQuote } from "./types";

/**
 * DB-dəki platforma tarifi ilə çatdırılma hesablaması.
 *
 * Niyə tarif lazımdır: platformalar həmişə QİYMƏT vermir —
 *  · 1688 `productShippingInfo`-da yalnız ÇƏKİ/ÖLÇÜ var, qiymət yoxdur;
 *  · Taobao-nun `orders/render` preview-i token icazəsi tələb edir (403).
 * Ona görə ölçülən çəki DB-dəki tarifə vurulur. Tarif kodda sabit deyil —
 * admin paneldən dəyişilir (qayda #4).
 */

/** Tarif sətri tapılmasa çatdırılma hesablanmır (uydurma rəqəm verilmir). */
export async function quoteFromRule(
  platformKey: string,
  args: ShippingArgs,
  weightGrams: number | null,
): Promise<ShippingQuote> {
  const rule = await prisma.platformShippingRule.findUnique({
    where: { platformKey },
  });

  if (!rule || !rule.isActive) {
    return {
      platformKey,
      amountCents: 0,
      currency: args.currency,
      basis: "rule",
      unavailable: true,
      message: "tariff-missing",
    };
  }

  // Pulsuz həddi — sifariş məbləği kifayətdirsə çatdırılma alınmır.
  if (rule.freeOverCents != null && args.subtotalCents >= rule.freeOverCents) {
    return {
      platformKey,
      amountCents: 0,
      currency: rule.currency,
      basis: weightGrams != null ? "weight-rule" : "rule",
      weightGrams: weightGrams ?? undefined,
      freeReason: "threshold",
    };
  }

  // Çəki məlum deyilsə tarifin ehtiyat çəkisi işlədilir — bu, TƏXMİNDİR və
  // `basis` ilə açıq işarələnir ki, hesabatda ölçülən çəki ilə qarışmasın.
  const effectiveGrams = weightGrams ?? rule.fallbackWeightGrams;
  const basis: ShippingBasis = weightGrams != null ? "weight-rule" : "rule";

  const perKgPart = Math.round((effectiveGrams / 1000) * rule.perKgCents);
  const amountCents = rule.baseCents + perKgPart;

  return {
    platformKey,
    amountCents,
    currency: rule.currency,
    basis,
    weightGrams: weightGrams ?? undefined,
    raw: {
      baseCents: rule.baseCents,
      perKgCents: rule.perKgCents,
      effectiveGrams,
      measured: weightGrams != null,
    },
  };
}

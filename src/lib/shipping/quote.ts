import "server-only";
import { prisma } from "@/lib/prisma";
import { getPlatformService } from "@/lib/partzona/platforms";
import type { ShippingLine, ShippingQuote } from "./types";

/**
 * ÇOXPLATFORMALI ÇATDIRILMA AQREQATORU.
 *
 * Bir müştəri 1688 + Taobao + Zara-dan məhsul alıb TƏK sifariş verə bilər.
 * Hər platformanın öz daxili çatdırılması və ÖZ VALYUTASI var, ona görə:
 *   · sətirlər `source` üzrə qruplaşdırılır,
 *   · hər qrupa öz platformasının servisi sorğu verir,
 *   · nəticələr AYRI-AYRI saxlanılır.
 *
 * VALYUTA QAYDASI: fərqli valyutalar (CNY, EUR) BİR rəqəmə TOPLANMIR — FX
 * qatı yoxdur, cross-currency cəm maliyyə səhvidir. Yekunlar valyuta üzrə
 * qruplaşdırılır və istifadəçiyə "¥528.00 + €45.90" kimi göstərilir.
 */

/** Səbətdən gələn sətir — qiymət DB-dən oxunur, client-dən QƏBUL EDİLMİR. */
export type CartLineInput = {
  productId: string;
  quantity: number;
  skuId?: string;
};

export type PlatformGroup = {
  platformKey: string;
  currency: string;
  itemsCents: number;
  shipping: ShippingQuote;
};

/** Valyuta üzrə yekun — sifariş bazaya belə yazılır. */
export type CurrencyTotal = {
  currency: string;
  itemsCents: number;
  shippingCents: number;
  totalCents: number;
};

export type CartQuote = {
  groups: PlatformGroup[];
  totals: CurrencyTotal[];
  /** Birdən çox valyuta var — tək yekun rəqəm göstərilə BİLMƏZ. */
  isMixedCurrency: boolean;
  /** Ən böyük paylı valyuta — `Order.totalCents` həmin valyutaya aiddir. */
  primaryCurrency: string;
};

/**
 * Səbət sətirlərinə görə platforma üzrə çatdırılma hesablayır.
 * Qiymətlər HƏMİŞƏ bazadan oxunur (səbət brauzerdədir, dəyişdirilə bilər).
 */
export async function quoteCart(lines: CartLineInput[]): Promise<CartQuote> {
  const empty: CartQuote = {
    groups: [],
    totals: [],
    isMixedCurrency: false,
    primaryCurrency: "CNY",
  };
  if (lines.length === 0) return empty;

  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) }, isActive: true },
    select: {
      id: true,
      source: true,
      currency: true,
      priceCents: true,
      oldPriceCents: true,
      externalId: true,
      minOrderQty: true,
      raw: true,
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Platformaya görə qruplaşdırma.
  type Bucket = {
    currency: string;
    itemsCents: number;
    hasDiscounted: boolean;
    lines: ShippingLine[];
  };
  const buckets = new Map<string, Bucket>();

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p?.source) continue;

    const quantity = Math.max(line.quantity, p.minOrderQty || 1);
    const bucket = buckets.get(p.source) ?? {
      currency: p.currency,
      itemsCents: 0,
      hasDiscounted: false,
      lines: [],
    };

    bucket.itemsCents += p.priceCents * quantity;
    if (p.oldPriceCents != null) bucket.hasDiscounted = true;
    bucket.lines.push({
      externalId: p.externalId ?? "",
      skuId: line.skuId,
      quantity,
      priceCents: p.priceCents,
      raw: p.raw,
    });

    buckets.set(p.source, bucket);
  }

  // Hər platformaya PARALEL sorğu — biri gec cavab versə digərləri gözləmir.
  const groups = await Promise.all(
    [...buckets.entries()].map(async ([platformKey, b]): Promise<PlatformGroup> => {
      const service = getPlatformService(platformKey);

      const fallback: ShippingQuote = {
        platformKey,
        amountCents: 0,
        currency: b.currency,
        basis: "rule",
        unavailable: true,
        message: "no-service",
      };

      if (!service?.shippingQuote) {
        return { platformKey, currency: b.currency, itemsCents: b.itemsCents, shipping: fallback };
      }

      try {
        const shipping = await service.shippingQuote({
          lines: b.lines,
          subtotalCents: b.itemsCents,
          currency: b.currency,
          hasDiscountedItems: b.hasDiscounted,
        });
        return { platformKey, currency: b.currency, itemsCents: b.itemsCents, shipping };
      } catch {
        // Bir platformanın xətası BÜTÜN səbəti sındırmamalıdır.
        return {
          platformKey,
          currency: b.currency,
          itemsCents: b.itemsCents,
          shipping: { ...fallback, message: "quote-failed" },
        };
      }
    }),
  );

  // Valyuta üzrə yekunlar — cross-currency cəm YOXDUR.
  const byCurrency = new Map<string, CurrencyTotal>();
  for (const g of groups) {
    // Çatdırılma valyutası nəzəri olaraq məhsul valyutasından fərqli ola bilər;
    // fərqlidirsə ayrı sətirdə saxlanılır ki, səhv toplanmasın.
    const shipCur = g.shipping.unavailable ? g.currency : g.shipping.currency;

    const itemRow = byCurrency.get(g.currency) ?? {
      currency: g.currency,
      itemsCents: 0,
      shippingCents: 0,
      totalCents: 0,
    };
    itemRow.itemsCents += g.itemsCents;
    byCurrency.set(g.currency, itemRow);

    if (!g.shipping.unavailable && g.shipping.amountCents > 0) {
      const shipRow = byCurrency.get(shipCur) ?? {
        currency: shipCur,
        itemsCents: 0,
        shippingCents: 0,
        totalCents: 0,
      };
      shipRow.shippingCents += g.shipping.amountCents;
      byCurrency.set(shipCur, shipRow);
    }
  }

  const totals = [...byCurrency.values()].map((t) => ({
    ...t,
    totalCents: t.itemsCents + t.shippingCents,
  }));

  // Ən böyük paylı valyuta — `Order.totalCents` yalnız ona aiddir.
  const primary = totals.reduce(
    (best, t) => (t.totalCents > (best?.totalCents ?? -1) ? t : best),
    totals[0],
  );

  return {
    groups,
    totals,
    isMixedCurrency: totals.length > 1,
    primaryCurrency: primary?.currency ?? "CNY",
  };
}

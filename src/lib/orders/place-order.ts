"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { orderReference, paymentReference } from "./reference";
import { buildSourceUrl } from "./source-url";
import { getPaymentProvider } from "./payment-provider";
import { quoteCart } from "@/lib/shipping/quote";
import { quoteLocalDelivery, type DeliveryMethod } from "@/lib/shipping/local";
import { getCurrencyConfig } from "@/lib/currency/config";
import { sumConverted } from "@/lib/currency";

/**
 * SİFARİŞ YARATMA
 *
 * Axın: kargo seçildi → "Ödə" → (Order + OrderItem + Payment) → provayderə yönləndirmə.
 *
 * QİYMƏTLƏR CLIENT-DƏN QƏBUL EDİLMİR. Səbət brauzerdə saxlanıldığı üçün
 * oradakı qiymət dəyişdirilə bilər; ona görə hər sətir üçün məhsul BAZADAN
 * yenidən oxunur və yalnız DB qiyməti işlədilir. Məhsul yoxa çıxıbsa və ya
 * qiymət dəyişibsə, sifariş səssizcə yaradılmır — istifadəçiyə bildirilir.
 */

/** Səbətin serverə göndərilən forması — qiymət YOXDUR, qəsdən. */
type CartLine = {
  id: string;
  quantity: number;
  size?: string;
  color?: string;
  variantId?: string;
  sku?: string;
};

export type PlaceOrderState = {
  error?: string;
  /** Qiyməti dəyişmiş/itmiş məhsulların adları — istifadəçiyə göstərilir. */
  changed?: string[];
};

function parseLines(raw: string): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((it): CartLine[] => {
      if (!it || typeof it !== "object") return [];
      const c = it as Record<string, unknown>;
      if (typeof c.id !== "string" || !c.id) return [];
      const qty = Math.floor(Number(c.quantity));
      if (!Number.isFinite(qty) || qty < 1) return [];
      return [
        {
          id: c.id,
          // Bir sətirdə həddindən artıq miqdar qəbul etmirik.
          quantity: Math.min(qty, 999),
          size: typeof c.size === "string" ? c.size : undefined,
          color: typeof c.color === "string" ? c.color : undefined,
          variantId: typeof c.variantId === "string" ? c.variantId : undefined,
          sku: typeof c.sku === "string" ? c.sku : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

/**
 * Yerli (AZN) çatdırılmanı valyuta üzrə yekunlara ƏLAVƏ edir.
 *
 * AZN sətri varsa ona əlavə olunur, yoxdursa YENİ sətir açılır. Platforma
 * valyutalarına (CNY/EUR) TOXUNULMUR — fərqli valyutaları toplamaq müştəriyə
 * yalan məbləğ göstərmək deməkdir.
 */
function mergeLocalTotal(
  totals: { currency: string; itemsCents: number; shippingCents: number; totalCents: number }[],
  local: { amountCents: number; currency: string },
) {
  const rows = totals.map((t) => ({ ...t }));
  if (local.amountCents <= 0) return rows;

  const existing = rows.find((t) => t.currency === local.currency);
  if (existing) {
    existing.shippingCents += local.amountCents;
    existing.totalCents += local.amountCents;
    return rows;
  }

  rows.push({
    currency: local.currency,
    itemsCents: 0,
    shippingCents: local.amountCents,
    totalCents: local.amountCents,
  });
  return rows;
}

export async function placeOrder(
  _prev: PlaceOrderState,
  formData: FormData,
): Promise<PlaceOrderState> {
  // Qonaq sifariş yarada bilməz — `/checkout` onsuz da qorunur, bu ikinci sədd.
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/checkout")}`);

  // ÇATDIRILMA SEÇİMİ — yalnız hansı ünvan/məntəqə seçildiyi qəbul edilir,
  // MƏBLƏĞ qəbul edilmir (aşağıda bazadan hesablanır).
  const methodRaw = String(formData.get("deliveryMethod") ?? "").trim();
  const method: DeliveryMethod =
    methodRaw === "pickup" ? "pickup" : "courier";
  const addressId = String(formData.get("addressId") ?? "").trim() || null;
  const pickupPointId =
    String(formData.get("pickupPointId") ?? "").trim() || null;

  if (method === "courier" && !addressId) return { error: "noAddress" };
  if (method === "pickup" && !pickupPointId) return { error: "noPickup" };

  const lines = parseLines(String(formData.get("items") ?? "[]"));
  if (lines.length === 0) {
    return { error: "emptyCart" };
  }

  // Məhsulları BİR sorğu ilə oxuyuruq (sətir başına sorğu atmamaq üçün).
  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.id) }, isActive: true },
    select: {
      id: true,
      name: true,
      priceCents: true,
      minOrderQty: true,
      source: true,
      externalId: true,
      sourceUrl: true,
      sku: true,
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Artıq satışda olmayan məhsullar — səssizcə atmaq yerinə adı ilə bildirilir.
  const missing = lines.filter((l) => !byId.has(l.id));
  if (missing.length > 0) {
    return { error: "unavailable", changed: missing.map((l) => l.id) };
  }

  const items = lines.map((line) => {
    const p = byId.get(line.id)!;
    // Platformanın minimum sifariş şərti burada da tətbiq olunur.
    const quantity = Math.max(line.quantity, p.minOrderQty || 1);
    return {
      productId: p.id,
      name: p.name,
      priceCents: p.priceCents, // ← YALNIZ DB qiyməti
      quantity,
      sku: line.sku ?? p.sku ?? null,
      // Müştərinin seçdiyi variant — avto-alış job-u məhz bunu alacaq.
      // Qiymətdən fərqli olaraq bunlar client-dən gəlir, çünki seçim
      // müştəriyə aiddir; server onları yalnız SAXLAYIR, hesablamada
      // istifadə etmir.
      size: line.size ?? null,
      color: line.color ?? null,
      source: p.source ?? null,
      sourceUrl: buildSourceUrl(p.source, p.externalId, p.sourceUrl),
    };
  });

  // ÇATDIRILMA SERVERDƏ YENİDƏN HESABLANIR — client-in göndərdiyi məbləğ
  // qəbul edilmir. Hər platforma öz daxili çatdırılmasını verir (Zara API-dən,
  // 1688 ölçülən çəki × tarif, Taobao tarif) və hər biri AYRICA saxlanılır.
  const quote = await quoteCart(
    lines.map((l) => ({ productId: l.id, quantity: l.quantity, skuId: l.sku })),
  );

  // YERLİ (AZN) çatdırılma — ünvanın RAYON tarifindən və ya PUDO məntəqəsindən.
  // Ünvan başqasınındırsa `null` qayıdır (IDOR qorunması); rayon seçilməyibsə
  // də `null` — belə halda sifariş yaradılmır, çünki haqq bilinmir.
  const local = await quoteLocalDelivery({
    method,
    addressId,
    pickupPointId,
    userId: user.id,
  });
  if (!local) {
    return { error: method === "courier" ? "missingRegion" : "noPickup" };
  }

  /* ------------------------- ÖDƏNİŞ VALYUTASI -------------------------
   * Mağazada vahid valyuta (`CurrencySettings.displayCurrency`, məs. USD)
   * təyin olunubsa, müştəri hər yerdə onu görür — ona görə TUTULAN məbləğ də
   * həmin valyutada olmalıdır. Yoxsa səbətdə $ göstərib CNY tutmuş olardıq.
   *
   * Çevirmə YALNIZ hər sətir çevrilə bildikdə edilir (`sumConverted` bir
   * məzənnə çatmasa `null` qaytarır). Çevrilmirsə köhnə davranış qalır:
   * əsas platforma valyutası. Yarımçıq çevirmə ilə yanlış məbləğ tutmaqdansa
   * mənbə valyutasında qalmaq düzgündür.
   *
   * `OrderTotal` sətirləri MƏNBƏ valyutalarında qalır — audit üçün həqiqət
   * odur (hansı platformaya nə qədər ödəyəcəyimiz).
   * ------------------------------------------------------------------- */
  const allTotals = mergeLocalTotal(quote.totals, local);
  const currencyConfig = await getCurrencyConfig();
  const charged = sumConverted(
    allTotals.map((t) => ({ cents: t.totalCents, currency: t.currency })),
    currencyConfig.displayCurrency,
    currencyConfig,
  );
  const chargedShipping = sumConverted(
    allTotals.map((t) => ({ cents: t.shippingCents, currency: t.currency })),
    currencyConfig.displayCurrency,
    currencyConfig,
  );

  const primaryTotal =
    quote.totals.find((t) => t.currency === quote.primaryCurrency) ?? null;

  const orderCurrency = charged?.currency ?? quote.primaryCurrency;
  const totalCents = charged?.cents ?? primaryTotal?.totalCents ?? 0;
  const shippingCents =
    chargedShipping?.cents ?? primaryTotal?.shippingCents ?? 0;
  // Çevirmə alındısa sifariş TƏK valyutalıdır — müştəri bir məbləğ ödəyir.
  const isMixed = charged ? false : quote.isMixedCurrency;

  const provider = getPaymentProvider();
  const payRef = paymentReference();

  // Sifariş və ödəniş cəhdi ATOMİK yaradılır — yarımçıq sifariş qalmasın.
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        reference: orderReference(),
        userId: user.id,
        status: "pending",
        isPaid: false,
        totalCents,
        shippingCents,
        currency: orderCurrency,
        isMixedCurrency: isMixed,
        deliveryMethod: method,
        addressId,
        pickupPointId,
        // İnsan üçün oxunaqlı snapshot — ünvan/məntəqə sonra silinsə də qalır.
        courier: method === "courier" ? local.label : null,
        branch: local.label,
        items: { create: items },
        // Platforma üzrə çatdırılma — hər biri öz valyutasında.
        shippings: {
          create: quote.groups
            .filter((g) => !g.shipping.unavailable)
            .map((g) => ({
              platformKey: g.platformKey,
              amountCents: g.shipping.amountCents,
              currency: g.shipping.currency,
              method: g.shipping.method ?? null,
              methodName: g.shipping.methodName ?? null,
              etaDays: g.shipping.etaDays ?? null,
              basis: g.shipping.basis,
              weightGrams: g.shipping.weightGrams ?? null,
              raw: (g.shipping.raw ?? null) as never,
            }))
            .concat([
              // Yerli mərhələ — platforma sətirləri ilə eyni cədvəldə, amma
              // `platformKey: "local"` ilə fərqlənir və öz valyutasındadır.
              {
                platformKey: "local",
                amountCents: local.amountCents,
                currency: local.currency,
                method: local.method,
                methodName: local.label,
                etaDays: null,
                basis: "rule" as const,
                weightGrams: null,
                raw: null as never,
              },
            ]),
        },
        // Valyuta üzrə yekunlar — HƏQİQƏT budur.
        //
        // Yerli çatdırılma AZN-dir, platforma çatdırılması CNY/EUR. Onlar
        // BİR sətirdə toplanmır: AZN öz sətrində görünür. Cross-currency cəm
        // maliyyə səhvi olardı (FX yalnız göstəriş üçündür).
        totals: {
          create: allTotals,
        },
      },
      select: { id: true },
    });

    // Çevirmə alındısa TƏK ödəniş (müştəri bir dəfə, bir valyutada ödəyir).
    // Alınmayıbsa köhnə davranış: hər valyuta üçün ayrı ödəniş, çünki bir
    // provayder bir çağırışda yalnız bir valyuta tutur.
    await tx.payment.createMany({
      data: charged
        ? [
            {
              reference: payRef,
              orderId: order.id,
              amountCents: charged.cents,
              currency: charged.currency,
              provider: provider.key,
              status: "pending",
            },
          ]
        : quote.totals.map((t, i) => ({
            reference: i === 0 ? payRef : `${payRef}-${t.currency}`,
            orderId: order.id,
            amountCents: t.totalCents,
            currency: t.currency,
            provider: provider.key,
            status: "pending",
          })),
    });
  });

  const session = await provider.createSession({
    paymentReference: payRef,
    amountCents: totalCents,
    currency: orderCurrency,
  });

  // `redirect` NEXT_REDIRECT atır — try/catch içində OLMAMALIDIR.
  redirect(session.redirectUrl);
}

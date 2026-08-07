import { NextResponse } from "next/server";
import { quoteCart } from "@/lib/shipping/quote";
import { getCurrencyConfig } from "@/lib/currency/config";
import { convertCents, sumConverted } from "@/lib/currency";

/**
 * Səbət üçün platforma üzrə çatdırılma hesablaması.
 *
 * Səbət brauzerdə saxlanıldığı üçün sətirlər buraya göndərilir, LAKİN qiymət
 * göndərilmir və qəbul edilmir — `quoteCart` hər məhsulu bazadan oxuyur
 * (qayda #2: xarici sorğular yalnız backend-dən).
 */

type Body = { items?: unknown };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const raw = Array.isArray(body.items) ? body.items : [];
  const lines = raw.flatMap((it) => {
    if (!it || typeof it !== "object") return [];
    const c = it as Record<string, unknown>;
    if (typeof c.id !== "string" || !c.id) return [];
    const qty = Math.floor(Number(c.quantity));
    if (!Number.isFinite(qty) || qty < 1) return [];
    return [
      {
        productId: c.id,
        // Bir sətirdə həddindən artıq miqdar qəbul etmirik.
        quantity: Math.min(qty, 999),
        skuId: typeof c.sku === "string" ? c.sku : undefined,
      },
    ];
  });

  if (lines.length === 0) {
    return NextResponse.json({
      groups: [],
      totals: [],
      isMixedCurrency: false,
      primaryCurrency: "CNY",
    });
  }

  // Səbətdəki bir platformanın xətası bütün cavabı sındırmır — `quoteCart`
  // özü hər qrupu ayrıca qoruyur.
  const quote = await quoteCart(lines);

  // VAHİD VALYUTA (admin `displayCurrency` təyin edibsə).
  //
  // Sifariş də həmin valyutada tutulur (`place-order.ts`), ona görə bu rəqəm
  // artıq "təxmini" deyil — müştərinin ödəyəcəyi məbləğdir. Bir sətir belə
  // çevrilə bilməsə `null` qayıdır və UI platforma valyutalarına qayıdır:
  // yarımçıq cəm yanlış məbləğ göstərmək olardı.
  const config = await getCurrencyConfig();
  const converted = sumConverted(
    quote.totals.map((t) => ({ cents: t.totalCents, currency: t.currency })),
    config.displayCurrency,
    config,
  );

  // Platforma üzrə çatdırılma da eyni valyutada görünsün — əks halda sətirlərdə
  // ¥, yekunda $ çıxırdı.
  const groups = quote.groups.map((g) => {
    const c = convertCents(
      g.shipping.amountCents,
      g.shipping.currency,
      config.displayCurrency,
      config,
    );
    return {
      ...g,
      shipping: {
        ...g.shipping,
        displayCents: c.cents,
        displayCurrency: c.currency,
      },
    };
  });

  return NextResponse.json({ ...quote, groups, converted });
}

/** Çatdırılma hesablaması platformalara sorğu atır — statik keşlənməməlidir. */
export const dynamic = "force-dynamic";

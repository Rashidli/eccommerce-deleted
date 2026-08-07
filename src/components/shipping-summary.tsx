"use client";

import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { formatMoney } from "@/lib/format";
import type { CartItem } from "@/context/cart-context";

/**
 * ÇATDIRILMA XÜLASƏSİ — platforma üzrə bölgü + valyuta üzrə yekun.
 *
 * Səbətdə 1688 + Taobao + Zara ola bilər. Hər platformanın çatdırılması
 * AYRICA hesablanır və AYRICA göstərilir, çünki valyutaları fərqlidir
 * (CNY / EUR). Fərqli valyutalar bir rəqəmə TOPLANMIR — FX qatı yoxdur və
 * belə cəm istifadəçiyə yalan məbləğ göstərərdi.
 */

type Group = {
  platformKey: string;
  currency: string;
  itemsCents: number;
  shipping: {
    amountCents: number;
    currency: string;
    methodName?: string;
    etaDays?: string;
    freeReason?: string;
    unavailable?: boolean;
    /** Vahid göstəriş valyutasına çevrilmiş məbləğ (serverdən). */
    displayCents?: number;
    displayCurrency?: string;
  };
};

type Total = {
  currency: string;
  itemsCents: number;
  shippingCents: number;
  totalCents: number;
};

type Quote = {
  groups: Group[];
  totals: Total[];
  isMixedCurrency: boolean;
  /**
   * Bütün valyutaların TƏK valyutaya çevrilmiş cəmi.
   *
   * Admin göstəriş valyutası təyin edibsə (məs. USD) sifariş də HƏMİN
   * valyutada tutulur — yəni bu, müştərinin ödəyəcəyi məbləğdir, təxmin
   * deyil. Ayar yoxdursa və ya məzənnə çatmırsa `null` və UI platforma
   * valyutalarına qayıdır.
   */
  converted?: { cents: number; currency: string } | null;
};

export function ShippingSummary({ items }: { items: CartItem[] }) {
  const { t } = useLang();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  // Səbət dəyişəndə yenidən hesablanır. Sətirlərin şəxsiyyəti (id + miqdar)
  // dəyişməyibsə sorğu atılmır — platformaya lazımsız yük düşməsin.
  const signature = items
    .map((i) => `${i.id}:${i.quantity}:${i.sku ?? ""}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    fetch("/api/shipping/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ id: i.id, quantity: i.quantity, sku: i.sku })),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Quote | null) => {
        if (!cancelled) setQuote(data);
      })
      .catch(() => {
        // Hesablama alınmasa səbət işləməyə davam edir.
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `signature` sətirlərin məzmununu təmsil edir; `items` referansı hər
    // render-də dəyişdiyi üçün ondan asılı olmaq sonsuz sorğu yaradardı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      {/* Platforma üzrə çatdırılma */}
      {quote?.groups.map((g) => (
        <div key={g.platformKey} className="flex items-start justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {g.platformKey}
              {g.shipping.methodName && (
                <span className="ml-1 text-xs opacity-70">· {g.shipping.methodName}</span>
              )}
            </span>
          </span>

          <span className="shrink-0 font-medium">
            {g.shipping.unavailable ? (
              <span className="text-xs text-muted-foreground">{t.checkout.shippingPending}</span>
            ) : g.shipping.amountCents === 0 ? (
              <span className="text-emerald-600">{t.checkout.freeShipping}</span>
            ) : (
              formatMoney(
                g.shipping.displayCents ?? g.shipping.amountCents,
                g.shipping.displayCurrency ?? g.shipping.currency,
              )
            )}
          </span>
        </div>
      ))}

      {loading && !quote && (
        <p className="text-xs text-muted-foreground">{t.checkout.platformShipping}…</p>
      )}

      {/* YEKUN.
          Vahid valyuta işləyirsə (`converted`) əsas rəqəm ODUR — sifariş də
          o valyutada tutulur. Platforma valyutaları yalnız qarışıq səbətdə,
          kiçik bölgü sətirləri kimi qalır (operator/şəffaflıq üçün).
          Çevirmə mümkün deyilsə köhnə davranış: hər valyuta ayrıca yekun. */}
      {quote && quote.totals.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          {quote.converted ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t.checkout.grandTotal}
                </span>
                <span className="text-lg font-bold text-brand">
                  {formatMoney(quote.converted.cents, quote.converted.currency)}
                </span>
              </div>

              {quote.isMixedCurrency &&
                quote.totals.map((tot) => (
                  <div
                    key={tot.currency}
                    className="flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span>{tot.currency}</span>
                    <span>{formatMoney(tot.totalCents, tot.currency)}</span>
                  </div>
                ))}
            </>
          ) : (
            quote.totals.map((tot) => (
              <div key={tot.currency} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {quote.isMixedCurrency ? tot.currency : t.checkout.grandTotal}
                </span>
                <span className="text-lg font-bold text-brand">
                  {formatMoney(tot.totalCents, tot.currency)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

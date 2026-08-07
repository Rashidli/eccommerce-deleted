"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Package } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useCart } from "@/context/cart-context";
import { useLang } from "@/context/lang-context";
import { formatMoney } from "@/lib/format";

type Item = {
  id: string;
  name: string;
  quantity: number;
  priceCents: number;
};

export function OrderConfirmation({
  reference,
  isPaid,
  totalCents,
  courier,
  branch,
  items,
}: {
  reference: string;
  isPaid: boolean;
  totalCents: number;
  courier: string | null;
  branch: string | null;
  items: Item[];
}) {
  const { t } = useLang();
  const { clearCart } = useCart();

  // Sifariş bazaya düşdü — səbət artıq lazım deyil. Yalnız ödəniş
  // TƏSDİQLƏNƏNDƏ təmizlənir; uğursuz ödənişdə səbət qalmalıdır ki,
  // istifadəçi yenidən cəhd edə bilsin.
  useEffect(() => {
    if (isPaid) clearCart();
  }, [isPaid, clearCart]);

  return (
    <PageShell title={t.checkout.successTitle}>
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <span
            className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
              isPaid
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isPaid ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : (
              <Clock className="h-7 w-7" />
            )}
          </span>

          <p className="mt-4 text-lg font-bold text-brand-ink">
            {isPaid ? t.checkout.successNote : t.checkout.pendingNote}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {t.checkout.orderRef}:{" "}
            <span className="font-mono font-semibold text-brand-ink">
              {reference}
            </span>
          </p>

          {courier && branch && (
            <p className="mt-3 text-sm text-muted-foreground">
              {courier} — {branch}
            </p>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-brand-ink">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatMoney(item.priceCents)} × {item.quantity}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-brand-ink">
                  {formatMoney(item.priceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="font-bold text-brand-ink">
              {t.checkout.grandTotal}
            </span>
            <span className="text-lg font-bold text-brand-ink">
              {formatMoney(totalCents)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/panel/orders"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
          >
            <Package className="h-4 w-4" />
            {t.checkout.viewOrders}
          </Link>
          <Link
            href="/products"
            className="flex-1 rounded-lg border border-border px-5 py-2.5 text-center text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
          >
            {t.pages.continueShopping}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

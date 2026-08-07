"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useCart } from "@/context/cart-context";
import { ShippingSummary } from "@/components/shipping-summary";
import { useLang } from "@/context/lang-context";
import { formatMoney } from "@/lib/format";

export default function CartPage() {
  const { t } = useLang();
  const { items, updateQuantity, removeItem, totalItems } = useCart();

  if (items.length === 0) {
    return (
      <PageShell title={t.pages.cart}>
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-lg text-muted-foreground">{t.pages.empty}</p>
          <Link
            href="/products"
            className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-brand-foreground transition-opacity hover:opacity-90"
          >
            {t.nav.shop}
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={t.pages.cart} subtitle={`${totalItems} ${t.pages.productsFound}`}>
      <div className="grid gap-8 pb-20 md:pb-0 lg:grid-cols-[1fr_320px]">
        {/* Elementlər */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={`${item.id}-${item.size}-${item.color}`}
              className="flex gap-4 rounded-2xl border border-border bg-card p-3"
            >
              {/* Boş `src` ilə <Image> heç nə çəkmir — yer tutucu göstərilir. */}
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.img ? (
                  <Image
                    src={item.img}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-contain"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-muted-foreground/40">
                    <ShoppingBag className="h-6 w-6" />
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {item.brand}
                </p>
                <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                <p className="mt-1 text-sm font-bold text-brand">
                  {formatMoney(item.priceCents, item.currency)}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* 1 ədəddə sönükdür — silmək zibil qutusu düyməsinin işidir. */}
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1, item.size, item.color)}
                      disabled={item.quantity <= 1}
                      aria-label="−"
                      className="grid h-7 w-7 place-items-center rounded-full border border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.size, item.color)}
                      className="grid h-7 w-7 place-items-center rounded-full border border-border hover:bg-muted"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id, item.size, item.color)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Xülasə — masaüstündə yan kart */}
        <div className="hidden h-fit rounded-2xl border border-border bg-card p-5 md:block">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>{t.pages.cart}</span>
          </div>
          {/* Platforma üzrə çatdırılma + valyuta üzrə yekun. Əvvəl burada
              bütün valyutalar "$" altında toplanırdı — CNY və EUR-u cəmləmək
              istifadəçiyə yalan məbləğ göstərirdi. */}
          <ShippingSummary items={items} />
          <Link
            href="/checkout"
            className="mt-4 block w-full rounded-lg bg-brand py-2.5 text-center font-semibold text-brand-foreground transition-opacity hover:opacity-90"
          >
            {t.pages.checkout}
          </Link>
        </div>
      </div>

      {/* Mobil — aşağıda sabit ödəniş paneli */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="min-w-0 shrink">
          <p className="text-[10px] text-muted-foreground">{t.pages.subtotal}</p>
          <p className="truncate text-sm font-bold text-brand-ink">
            {totalItems} {t.panel.items}
          </p>
        </div>
        <Link
          href="/checkout"
          className="ml-auto flex-1 rounded-full bg-brand py-3.5 text-center text-sm font-semibold text-brand-foreground transition-transform active:scale-95"
        >
          {t.pages.checkout}
        </Link>
      </div>
    </PageShell>
  );
}

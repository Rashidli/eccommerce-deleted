"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Truck, MapPin, CalendarCheck, Hash } from "lucide-react";
import { useLang } from "@/context/lang-context";
import type { PanelOrder } from "@/lib/data/account";
import { PRODUCT_BLUR } from "@/lib/image-placeholder";
import { STATUS_STYLES, UNPAID_STYLE } from "./status";
import { OrderTimeline } from "./order-timeline";

// Sifariş detalı — bütün data bazadan (`getUserOrderByReference`) gəlir.
// Status rəngləri ORTAQ moduldadır (`./status`) ki, siyahı, detal və timeline
// bir-birindən ayrılmasın.

export function OrderDetail({ order }: { order: PanelOrder }) {
  const { t } = useLang();
  const pieces = order.items.reduce((sum, i) => sum + i.quantity, 0);

  const shipping: { icon: typeof Truck; label: string; value: string }[] = [
    { icon: Truck, label: t.panel.courier, value: order.courier },
    { icon: MapPin, label: t.checkout.branches, value: order.branch },
    { icon: Hash, label: t.panel.tracking, value: order.tracking },
    { icon: CalendarCheck, label: t.panel.date, value: order.deliveryDate },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/panel/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.panel.orders}
      </Link>

      {/* Başlıq — NÖMRƏ mərkəzdə və iri, ətrafında status/ödəniş */}
      <div className="rounded-2xl border border-border bg-card px-4 py-5 text-center sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t.panel.orderNumber}
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-brand-ink">
          {order.id}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_STYLES[order.status]}`}
          >
            {t.panel[order.status]}
          </span>
          {/* Ödənilməmiş sifarişdə ödəniş vəziyyəti statusdan daha vacibdir. */}
          {!order.isPaid && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${UNPAID_STYLE}`}
            >
              {t.panel.awaitingPayment}
            </span>
          )}
        </div>

        <p className="mt-2.5 text-sm text-muted-foreground">
          {order.date} · {pieces} {t.panel.items}
        </p>
      </div>

      {/* Prosesin gedişi — səhifənin əsas hissəsi */}
      <OrderTimeline order={order} />

      {/* Çatdırılma məlumatı — dəyəri olmayan xanalar göstərilmir
          ("—" ilə dolu dörd boş kart səhifəni yükləyir). */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shipping
          .filter(({ value }) => value && value !== "—")
          .map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Platforma üzrə çatdırılma — bir sifarişdə 3 platforma ola bilər,
          hər birinin öz haqqı və VALYUTASI var. */}
      {order.shippings.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <p className="border-b border-border bg-secondary/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t.checkout.delivery}
          </p>
          <ul className="divide-y divide-border">
            {order.shippings.map((s) => (
              <li
                key={s.platformKey}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize text-foreground">
                    {s.platformKey}
                  </p>
                  {(s.method || s.etaDays) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[s.method, s.etaDays].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold text-foreground">
                  {s.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Məhsullar — sifariş anındakı ad və qiymətlə (tarixçə pozulmasın) */}
      <div className="overflow-hidden rounded-xl border border-border">
        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {item.img && (
                  <Image
                    src={item.img}
                    alt={item.name}
                    fill
                    sizes="64px"
                    placeholder="blur"
                    blurDataURL={PRODUCT_BLUR}
                    className="object-contain p-1"
                  />
                )}
              </span>

              <div className="min-w-0 flex-1">
                {/* Məhsul silinibsə link vermirik — sınıq keçid olmasın. */}
                {item.productId ? (
                  <Link
                    href={`/products/${item.productId}`}
                    className="line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-brand"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {item.name}
                  </p>
                )}
                {item.brand && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.brand}</p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-foreground">{item.price}</p>
                <p className="text-xs text-muted-foreground">× {item.quantity}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Yekun — VALYUTA ÜZRƏ ayrı sətirlər.
            Qarışıq sifarişdə (məs. 1688 CNY + Zara EUR) fərqli valyutalar
            BİR rəqəmə toplanmır — toplasaq uydurma məbləğ çıxardı. */}
        <div className="border-t border-border bg-secondary/30 px-4 py-3">
          {order.totals.length > 0 ? (
            <div className="space-y-2">
              {order.totals.map((tot) => (
                <div key={tot.currency} className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{t.checkout.subtotal}</span>
                    <span>{tot.items}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{t.checkout.delivery}</span>
                    <span>{tot.shipping}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/60 pt-1">
                    <span className="text-sm font-medium text-foreground">
                      {t.panel.total} · {tot.currency}
                    </span>
                    <span className="text-lg font-bold text-brand-ink">
                      {tot.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {t.panel.total}
              </span>
              <span className="text-lg font-bold text-brand-ink">{order.total}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

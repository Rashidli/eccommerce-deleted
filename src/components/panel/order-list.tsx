"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, PackageOpen } from "lucide-react";
import { useLang } from "@/context/lang-context";
import type { PanelOrder } from "@/lib/data/account";
import { PRODUCT_BLUR } from "@/lib/image-placeholder";
import { STATUS_STYLES, UNPAID_STYLE } from "./status";
import { OrderProgressDots } from "./order-timeline";

/**
 * Sifariş kartı.
 *
 * İyerarxiya: müştəri əvvəlcə NÖMRƏNİ, statusu və məbləği axtarır — onlar
 * mərkəzdə və iri şriftdədir. Tarix, məhsul sayı, kuryer kimi metadata isə
 * ikinci plandadır. Əvvəl nömrə solda kiçik link idi və gözə dəymirdi.
 *
 * Bütün kart bir linkdir (detala keçid) — "Detallar" düyməsi yerinə, çünki
 * detal artıq ayrıca səhifədədir.
 */
export function OrderCard({ order }: { order: PanelOrder }) {
  const { t } = useLang();
  const pieces = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Link
      href={`/panel/orders/${order.id}`}
      className="group block rounded-2xl border border-border bg-card transition-all hover:border-brand/50 hover:shadow-sm"
    >
      {/* ---- Baş hissə: NÖMRƏ mərkəzdə, ətrafında status və məbləğ ---- */}
      <div className="border-b border-border px-4 py-4 text-center sm:px-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t.panel.orderNumber}
        </p>
        <p className="mt-0.5 font-mono text-lg font-bold tracking-tight text-brand-ink sm:text-xl">
          {order.id}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_STYLES[order.status]}`}
          >
            {t.panel[order.status]}
          </span>
          {/* Ödənilməmiş sifarişdə bu, statusdan daha vacibdir. */}
          {!order.isPaid && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${UNPAID_STYLE}`}
            >
              {t.panel.awaitingPayment}
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {order.date} · {pieces} {t.panel.items}
        </p>
      </div>

      {/* ---- Proses göstəricisi ---- */}
      <div className="px-4 py-3 sm:px-5">
        <OrderProgressDots order={order} />
      </div>

      {/* ---- Alt hissə: şəkillər + məbləğ ---- */}
      <div className="flex items-center gap-3 border-t border-border px-4 py-3 sm:px-5">
        <div className="flex -space-x-2.5">
          {order.items.slice(0, 4).map((item) =>
            item.img ? (
              <span
                key={item.id}
                className="relative h-10 w-10 overflow-hidden rounded-lg border-2 border-card bg-secondary"
              >
                <Image
                  src={item.img}
                  alt={item.name}
                  fill
                  sizes="40px"
                  placeholder="blur"
                  blurDataURL={PRODUCT_BLUR}
                  className="object-cover"
                />
              </span>
            ) : null,
          )}
          {order.items.length > 4 && (
            <span className="grid h-10 w-10 place-items-center rounded-lg border-2 border-card bg-secondary text-xs font-semibold text-muted-foreground">
              +{order.items.length - 4}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Qarışıq valyutalı sifarişdə hər valyuta AYRI sətirdir —
              fərqli valyutalar bir rəqəmə toplanmır. */}
          <div className="text-right">
            {order.totals.length > 0 ? (
              order.totals.map((tot) => (
                <p
                  key={tot.currency}
                  className="text-sm font-bold leading-tight text-brand-ink"
                >
                  {tot.total}
                </p>
              ))
            ) : (
              <p className="text-sm font-bold text-brand-ink">{order.total}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
        </div>
      </div>
    </Link>
  );
}

/** Sifariş yoxdursa — boş sətir yerinə istiqamətləndirici boş vəziyyət. */
export function OrdersEmptyState() {
  const { t } = useLang();

  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <PackageOpen className="h-7 w-7" />
      </span>
      <p className="mt-4 font-semibold text-brand-ink">{t.panel.noOrders}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t.panel.noOrdersHint}
      </p>
      <Link
        href="/products"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
      >
        {t.panel.startShopping}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function OrderList({ orders }: { orders: PanelOrder[] }) {
  if (orders.length === 0) return <OrdersEmptyState />;

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

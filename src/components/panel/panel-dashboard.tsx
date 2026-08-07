"use client";

import Link from "next/link";
import {
  Package,
  User,
  ChevronRight,
  Truck,
  PackageCheck,
  Wallet,
  BadgeCheck,
} from "lucide-react";
import { useLang } from "@/context/lang-context";
import { OrderList } from "@/components/panel/order-list";
import type { PanelOrder, PanelStats } from "@/lib/data/account";

export function PanelDashboard({
  name,
  email,
  customerCode,
  stats,
  recentOrders,
}: {
  name: string;
  email: string;
  /** `FOR000001` — anbar paketi bu kodla tanıyır. */
  customerCode: string;
  stats: PanelStats;
  recentOrders: PanelOrder[];
}) {
  const { t } = useLang();

  // Statistika BAZADAN gəlir. "Yadda saxlanmış ünvanlar" çıxarıldı — ünvanlar
  // artıq paneldə deyil, sifariş mərhələsindədir; orada göstərmək yanıldıcı idi.
  const cards = [
    { label: t.panel.totalOrders, value: String(stats.orderCount), icon: Package },
    { label: t.panel.processing, value: String(stats.activeCount), icon: Truck },
    {
      label: t.panel.delivered,
      value: String(stats.deliveredCount),
      icon: PackageCheck,
    },
    // Xərc valyuta üzrə ayrıdır — fərqli valyutalar toplanmır.
    ...stats.spent.map((s) => ({
      label: `${t.panel.total} · ${s.currency}`,
      value: s.amount,
      icon: Wallet,
    })),
  ];

  const menu = [
    {
      href: "/panel/orders",
      label: t.panel.orders,
      icon: Package,
      hint: String(stats.orderCount),
    },
    { href: "/panel/profile", label: t.panel.profile, icon: User, hint: "" },
  ];

  return (
    <>
      {/* MÜŞTƏRİ KODU — sifariş İspaniya anbarımıza bu kodla düşür, ona görə
          istifadəçi onu asan görməli və köçürə bilməlidir. */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand/25 bg-brand/5 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
          <BadgeCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {t.panel.customerCode}
          </p>
          <p className="font-mono text-lg font-bold tracking-wider text-brand-ink">
            {customerCode}
          </p>
        </div>
        <p className="hidden max-w-[45%] text-right text-[11px] leading-tight text-muted-foreground sm:block">
          {t.panel.customerCodeHint}
        </p>
      </div>

      {/* ---------- MOBİL: profil başlığı + sətir siyahısı ---------- */}
      <div className="md:hidden">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <User className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-brand-ink">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        {/* Mobildə də statlar görünür — əvvəl yalnız masaüstündə idi,
            telefonda istifadəçi heç bir icmal görmürdü. */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          {cards.slice(0, 3).map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-2.5 text-center"
            >
              <Icon className="mx-auto h-4 w-4 text-brand" />
              <p className="mt-1.5 text-lg font-bold leading-none text-brand-ink">
                {value}
              </p>
              <p className="mt-1 truncate text-[10px] leading-tight text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          {menu.map(({ href, label, icon: Icon, hint }, index) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-4 transition-colors active:bg-secondary ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-brand">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-medium text-brand-ink">
                {label}
              </span>
              {hint && (
                <span className="text-xs text-muted-foreground">{hint}</span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* ---------- MASAÜSTÜ: statlar + son sifarişlər ---------- */}
      <div className="hidden space-y-8 md:block">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
            >
              <div className="flex items-start justify-between gap-2">
                {/* Rəqəm əsas elementdir — böyük və tünd; etiket ikinci planda. */}
                <p className="text-2xl font-bold leading-none text-brand-ink">
                  {value}
                </p>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-brand-ink">{t.panel.recentOrders}</h2>
            {recentOrders.length > 0 && (
              <Link
                href="/panel/orders"
                className="text-sm font-medium text-brand hover:underline"
              >
                {t.common.seeAll}
              </Link>
            )}
          </div>
          <OrderList orders={recentOrders} />
        </div>
      </div>
    </>
  );
}

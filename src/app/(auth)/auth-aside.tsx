"use client";

import Image from "next/image";
import { Globe2, BadgePercent, Truck, Headphones } from "lucide-react";
import { useLang } from "@/context/lang-context";

// Auth səhifələrinin sol brend paneli — yalnız geniş ekranda (lg+).
export function AuthAside() {
  const { t } = useLang();

  const perks = [
    { icon: Globe2, ...t.perks.global },
    { icon: BadgePercent, ...t.perks.prices },
    { icon: Truck, ...t.perks.shipping },
    { icon: Headphones, ...t.perks.support },
  ];

  return (
    <aside className="relative hidden h-full overflow-hidden bg-gradient-to-br from-brand via-purple-600 to-brand-ink p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-10">
      {/* Dekorativ işıq ləkələri */}
      <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-fuchsia-400/25 blur-3xl" />

      {/* Başlıq */}
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
          {t.hero.subtitle}
        </p>
        <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight">
          {t.hero.title}
        </h2>
        <p className="mt-3 max-w-sm whitespace-pre-line text-sm leading-relaxed text-white/80">
          {t.hero.description}
        </p>
      </div>

      {/* Vizual */}
      <div className="relative my-4 flex min-h-0 flex-1 items-center justify-center">
        <Image
          src="/hero_image.png"
          alt=""
          width={560}
          height={420}
          priority
          className="max-h-[26vh] w-auto max-w-[220px] object-contain drop-shadow-2xl"
        />
      </div>

      {/* Üstünlüklər */}
      <ul className="relative space-y-3">
        {perks.map(({ icon: Icon, title, sub }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-white/70">{sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

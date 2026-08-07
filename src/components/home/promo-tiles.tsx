"use client";

import Image from "next/image";
import Link from "next/link";
import type { CampaignDTO } from "@/lib/data/catalog";

export function PromoTiles({ campaigns }: { campaigns: CampaignDTO[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {campaigns.map((promo) => (
        <Link
          key={promo.key}
          href={promo.href}
          className={`group relative flex items-center justify-between overflow-hidden rounded-lg ${promo.tint} px-5  py-5 md:py-0`}
        >
          <div className="relative z-10">
            <p className="font-display text-lg font-bold text-brand-ink">
              {promo.eyebrow}
            </p>
            <p className="mt-1 text-xs font-semibold text-brand-ink/70">
              {promo.title}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-md bg-white/60 px-4 py-1.5 text-xs font-semibold text-brand-ink backdrop-blur">
              {promo.cta} →
            </span>
          </div>

          <Image
            src={promo.img}
            alt={promo.eyebrow}
            width={208}
            height={152}
            className=" h-20 w-38 md:h-38 md:w-52 object-contain transition group-hover:scale-105"
          />
        </Link>
      ))}
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/context/lang-context";

export function HeroSection() {
  const { t } = useLang();

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#e0f2fe] to-[#ede9fe] p-6 sm:p-8 md:p-12 min-h-[200px] sm:min-h-[280px] md:min-h-[350px] lg:min-h-[400px] flex items-center">
      {/* Left Content */}
      <div className="relative z-10 max-w-[55%] sm:max-w-[60%]">
        <h1 className="text-xl sm:text-3xl md:text-5xl font-bold leading-tight text-brand-ink">
          {t.hero.title}
          <br />
          <span className="text-brand">{t.hero.subtitle}</span>
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-brand-ink/70 max-w-sm hidden sm:block">
          {t.hero.description.replace("\n", " ")}
        </p>
        <Link
          href="/products"
          className="mt-3 sm:mt-5 inline-flex items-center gap-1 sm:gap-2 rounded-full bg-brand-ink px-2.5 sm:px-6 py-1.5 sm:py-2.5 text-[10px] sm:text-sm font-semibold text-white shadow-lg transition hover:bg-brand"
        >
          {t.hero.cta} →
        </Link>
      </div>

      {/* Right Image - absolute positioned at bottom */}
      <div className="absolute bottom-0 right-4 sm:right-8 md:right-12 w-32 h-40 sm:w-52 sm:h-64 md:w-72 md:h-80 lg:w-80 lg:h-96">
        <Image
          src="/hero_image.png"
          alt="Fashion model"
          fill
          sizes="(max-width: 640px) 128px, (max-width: 768px) 208px, (max-width: 1024px) 288px, 320px"
          className="object-contain object-bottom"
          priority
        />
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-200/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-2xl" />
    </section>
  );
}

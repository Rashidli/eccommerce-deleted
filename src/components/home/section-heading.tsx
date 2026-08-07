"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Bütün home bölmələri üçün eyni başlıq ritmi — brend vurğulu incə xətt. */
export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold text-brand-ink md:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
        <span className="mt-2 block h-1 w-10 rounded-full bg-gradient-to-r from-brand to-purple-500" />
      </div>

      {href && linkLabel && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand hover:underline"
        >
          {linkLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

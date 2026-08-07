"use client";

import Link from "next/link";
import { LangSwitcher } from "@/components/lang-switcher";
import { useLang } from "@/context/lang-context";
import { headerNav } from "@/lib/mock-data";

// Header-in ən üst nazik zolağı — naviqasiya linkləri + dil seçici
export function TopBar() {
  const { t } = useLang();

  // Kateqoriyalar aşağıdakı zolaqda göstərilir, ona görə burada göstərmirik
  const links = headerNav.filter((l) => l.key !== "categories");

  return (
    <div className="border-b border-border/60 bg-secondary/40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 h-9">
        <nav className="flex items-center gap-5 text-xs font-medium overflow-x-auto scrollbar-hide">
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`shrink-0 transition-colors ${
                link.active
                  ? "text-brand"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t.nav[link.key]}
            </Link>
          ))}
        </nav>

        <LangSwitcher />
      </div>
    </div>
  );
}

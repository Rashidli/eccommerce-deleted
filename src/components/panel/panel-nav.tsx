"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, User, MapPin, LogOut } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { logout } from "@/app/(auth)/actions";

export function PanelNav() {
  const { t } = useLang();
  const pathname = usePathname();

  const links = [
    { href: "/panel", label: t.panel.dashboard, icon: LayoutGrid },
    { href: "/panel/orders", label: t.panel.orders, icon: Package },
    { href: "/panel/addresses", label: t.panel.addresses, icon: MapPin },
    { href: "/panel/profile", label: t.panel.profile, icon: User },
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
      {links.map(({ href, label, icon: Icon }) => {
        // "/panel" yalnız tam uyğunluqda aktivdir, alt route-lar onu aktiv etməməlidir.
        const active = href === "/panel" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand text-brand-foreground"
                : "text-foreground/70 hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}

      {/* Çıxış — server action DB sessiyasını bağlayır */}
      <form action={logout} className="shrink-0 md:mt-2">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          {t.panel.logout}
        </button>
      </form>
    </nav>
  );
}

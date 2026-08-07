"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, Store } from "lucide-react";
import { adminNav } from "./nav";

function isActive(pathname: string, href: string): boolean {
  // "/admin" yalnız dəqiq uyğunluq — yoxsa bütün alt yollarda aktiv görünür.
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

function NavLinks({
  onNavigate,
  allowed,
}: {
  onNavigate?: () => void;
  /** Serverdə hesablanmış icazəli bölmələr — boşdursa hamısı göstərilir. */
  allowed?: string[];
}) {
  const pathname = usePathname();
  const items = allowed?.length
    ? adminNav.filter((i) => allowed.includes(i.href))
    : adminNav;

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive(pathname, href)
              ? "bg-brand text-brand-foreground"
              : "text-foreground hover:bg-secondary"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Footer({ name }: { name?: string }) {
  return (
    <div className="mt-auto space-y-0.5 border-t border-border pt-3">
      {name && (
        <p className="truncate px-3 py-1.5 text-xs text-muted-foreground">
          {name}
        </p>
      )}
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <Store className="h-4 w-4 shrink-0" />
        Mağazaya bax
      </Link>
      <form action="/admin/logout" method="post">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Çıxış
        </button>
      </form>
    </div>
  );
}

export function AdminSidebar({
  allowed,
  adminName,
}: {
  allowed?: string[];
  adminName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobil başlıq */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background px-3 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menyu"
          className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-bold tracking-tight text-brand-ink">
          E-COMMERCE <span className="text-muted-foreground">admin</span>
        </span>
      </header>

      {/* Mobil çekmece */}
      {open && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-3 overflow-y-auto border-r border-border bg-background p-3">
            <div className="flex items-center justify-between px-1">
              <span className="font-bold tracking-tight text-brand-ink">
                E-COMMERCE
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Bağla"
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks allowed={allowed} onNavigate={() => setOpen(false)} />
            <Footer name={adminName} />
          </aside>
        </div>
      )}

      {/* Masaüstü yan panel */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-3 border-r border-border bg-card p-3 lg:flex">
        <Link href="/admin" className="px-2 py-3">
          <span className="text-lg font-bold tracking-tight text-brand-ink">
            E-COMMERCE
          </span>
          <span className="ml-1.5 text-xs text-muted-foreground">admin</span>
        </Link>
        <NavLinks allowed={allowed} />
        <Footer name={adminName} />
      </aside>
    </>
  );
}

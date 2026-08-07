"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, ChevronRight } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { useWishlist } from "@/context/wishlist-context";
import { LangSwitcher } from "@/components/lang-switcher";
import { bottomNavMore } from "@/lib/mock-data";

// Mobil burger menyu — giriş, bütün naviqasiya linkləri və dil seçici.
export function MobileMenu({ user }: { user?: { fullName: string } | null }) {
  const { t } = useLang();
  const { totalItems: wishlistItems } = useWishlist();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Menyu açıqkən arxadakı səhifə sürüşməsin.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  // Header `backdrop-blur` işlədir — bu, altındakı `fixed` elementlər üçün yeni
  // saxlayıcı blok yaradır və panel header-in içinə sıxılır. Ona görə body-yə portal edirik.
  const drawer = (
    <>
      {/* Örtük */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-in fade-in duration-200 md:hidden"
        onClick={close}
      />

      {/* Yandan açılan panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-sm flex-col bg-card shadow-2xl animate-in slide-in-from-right duration-300 md:hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <p className="font-display text-xl font-extrabold text-brand-ink">
            E-C<span className="text-brand">O</span>MMERCE
            <span className="text-brand">.</span>
          </p>
          <button
            onClick={close}
            aria-label={t.common.close}
            className="grid h-9 w-9 place-items-center rounded-full text-foreground/60 transition-transform active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Giriş */}
          <Link
            href={user ? "/panel" : "/login"}
            onClick={close}
            className="flex items-center gap-3 border-b border-border px-4 py-4 transition-colors active:bg-secondary"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand/10 text-brand">
              <User className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-brand-ink">
                {user ? user.fullName : t.common.login}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user ? t.nav.panel : t.pages.loginSub}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>

          {/* Naviqasiya */}
          <nav className="py-2">
            {bottomNavMore.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              const badge = item.href === "/wishlist" ? wishlistItems : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors active:bg-secondary ${
                    active
                      ? "font-semibold text-brand"
                      : "text-foreground/80"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{t.nav[item.key]}</span>
                  {badge > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Dil seçici */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <span className="text-sm text-muted-foreground">
            {t.pages.settings}
          </span>
          <LangSwitcher />
        </div>
      </aside>
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t.nav.more}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/70 transition-transform active:scale-90 md:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && typeof document !== "undefined" && createPortal(drawer, document.body)}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, Heart, User } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { useSearch } from "@/context/search-context";

// Mobil alt panel — tətbiqdəki kimi: ana səhifə · axtarış · səbət · sevimlilər · profil.
// Qalan bölmələr header-dəki burger menyudadır.
export function BottomNav({ user }: { user?: { fullName: string } | null }) {
  const pathname = usePathname();
  const { t } = useLang();
  const { totalItems: cartItems } = useCart();
  const { totalItems: wishlistItems } = useWishlist();
  const { focusSearch } = useSearch();

  const items = [
    { key: "home", label: t.nav.home, icon: Home, href: "/" },
    { key: "search", label: t.nav.search, icon: Search, action: () => focusSearch() },
    { key: "cart", label: t.nav.cart, icon: ShoppingCart, href: "/cart", badge: cartItems },
    { key: "wishlist", label: t.nav.wishlist, icon: Heart, href: "/wishlist", badge: wishlistItems },
    { key: "account", label: user ? t.nav.panel : t.nav.account, icon: User, href: user ? "/panel" : "/login" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href ? pathname === item.href : false;
          const badge = item.badge ?? 0;

          const inner = (
            <>
              <span className="relative">
                <Icon className={`h-5 w-5 ${active ? "fill-brand/15" : ""}`} />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-0.5 text-[10px] font-bold text-brand-foreground">
                    {badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </>
          );

          const className = `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-transform active:scale-90 ${
            active ? "text-brand" : "text-muted-foreground"
          }`;

          return item.href ? (
            <Link key={item.key} href={item.href} className={className}>
              {inner}
            </Link>
          ) : (
            <button
              key={item.key}
              onClick={item.action}
              aria-label={item.label}
              className={className}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

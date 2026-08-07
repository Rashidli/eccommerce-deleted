"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/context/lang-context";

interface FooterLink {
  label: string;
  href: string;
}

export function Footer() {
  const { t } = useLang();

  const shopLinks: FooterLink[] = [
    { label: t.nav.shop, href: "/products" },
    { label: t.pages.categories, href: "/categories" },
    { label: t.pages.deals, href: "/deals" },
    { label: t.pages.new, href: "/new" },
    { label: t.pages.sale, href: "/sale" },
    { label: t.pages.brands, href: "/brands" },
  ];
  const accountLinks: FooterLink[] = [
    { label: t.pages.account, href: "/login" },
    { label: t.panel.title, href: "/panel" },
    { label: t.pages.wishlist, href: "/wishlist" },
    { label: t.pages.cart, href: "/cart" },
    { label: t.pages.help, href: "/help" },
    { label: t.pages.settings, href: "/settings" },
  ];

  return (
    <footer className="bg-brand-ink text-white/80">
      {/* ABUNƏ (newsletter) bloku LƏĞV EDİLDİ — initask #3439.
          Forma onsuz da işləmirdi: `preventDefault()` ilə dayanırdı, heç bir
          yerə yazılmırdı. İşləməyən sahə saxlamaq istifadəçini aldadır.
          Blokdakı yarpaq şəkli itməsin deyə aşağıda loqonun yanına keçdi. */}

      {/* Links Section */}
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <p className="font-display text-2xl font-extrabold text-white">
              E-COMMERCE<span className="text-brand">.</span>
            </p>
            <Image
              src="/leaf.png"
              alt=""
              width={100}
              height={80}
              // Dekorativdir — `alt=""` ki ekran oxuyucusu təkrar "E-Commerce" deməsin.
              className="h-10 w-auto object-contain"
            />
          </div>
          <p className="mt-3 max-w-xs text-sm text-white/60">{t.footer.tagline}</p>
          <div className="mt-4 flex gap-4 text-white/70">
            <Link href="#" aria-label="Facebook" className="hover:text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </Link>
            <Link href="#" aria-label="Instagram" className="hover:text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </Link>
            <Link href="#" aria-label="X" className="hover:text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Link>
            <Link href="#" aria-label="YouTube" className="hover:text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </Link>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-white">{t.footer.shop}</p>
          <ul className="space-y-2 text-xs">
            {shopLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-white">{t.footer.account}</p>
          <ul className="space-y-2 text-xs">
            {accountLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-4 text-xs text-white/50">
          <p>&copy; 2026 E-Commerce. {t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}

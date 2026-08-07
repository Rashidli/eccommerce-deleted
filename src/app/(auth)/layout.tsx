import Link from "next/link";
import { LangProvider } from "@/context/lang-context";
import { LangSwitcher } from "@/components/lang-switcher";
import { AuthAside } from "./auth-aside";

// Auth çərçivəsi — mağaza header/footer/bottom-nav YOXDUR.
// Geniş ekranda: solda brend paneli, sağda forma. Mobildə: yalnız forma.
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <LangProvider>
      {/* dvh — mobil brauzer paneli nəzərə alınır; overflow-hidden → səhifə scroll etmir */}
      <div className="grid h-[100dvh] overflow-hidden lg:grid-cols-2">
        <AuthAside />

        <div className="relative flex h-full flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-brand/10 via-background to-background px-4 py-6">
          {/* Mobildə brend zolağı — sol panel gizli olduğu üçün rəng buradan gəlir */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand via-purple-500 to-fuchsia-500 lg:hidden" />

          <div className="absolute right-4 top-5">
            <LangSwitcher />
          </div>

          <Link
            href="/"
            className="mb-5 shrink-0 font-display text-2xl font-extrabold tracking-tight text-brand-ink"
          >
            E-C<span className="text-brand">O</span>MMERCE
            <span className="text-brand">.</span>
          </Link>

          {children}
        </div>
      </div>
    </LangProvider>
  );
}

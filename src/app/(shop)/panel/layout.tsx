"use client";

import { usePathname } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { PanelNav } from "@/components/panel/panel-nav";
import { useLang } from "@/context/lang-context";

// Mobildə: hər bölmə öz ekranıdır — yuxarıda geri düyməsi + ekranın adı.
// Masaüstündə: klassik yan naviqasiya + böyük başlıq.
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLang();
  const pathname = usePathname();

  const titles: Record<string, string> = {
    "/panel": t.panel.title,
    "/panel/orders": t.panel.orders,
    "/panel/addresses": t.panel.addresses,
    "/panel/profile": t.panel.profile,
  };
  const title = titles[pathname] ?? t.panel.title;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobil ekran başlığı */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5 md:hidden">
        <BackButton />
        <h1 className="truncate text-base font-semibold text-brand-ink">
          {title}
        </h1>
      </div>

      <div className="mx-auto max-w-7xl md:px-4 md:py-8">
        {/* Masaüstü başlığı */}
        <div className="mb-6 hidden md:block">
          <h1 className="text-3xl font-bold text-brand-ink">{t.panel.title}</h1>
          <p className="mt-1 text-muted-foreground">{t.panel.subtitle}</p>
        </div>

        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-6">
          <div className="hidden md:block">
            <PanelNav />
          </div>

          {/* Mobildə çərçivəsiz, masaüstündə kart */}
          <div className="px-4 py-4 pb-24 md:rounded-2xl md:border md:border-border md:bg-card md:p-6 md:pb-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

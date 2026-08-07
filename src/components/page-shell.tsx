import { BackButton } from "@/components/back-button";

// Bütün alt səhifələr üçün eyni çərçivə (Header/Footer layout-dan gəlir).
// Mobildə tətbiq ekranı kimi görünür: geri düyməsi + başlıq.
// Masaüstündə isə adi səhifə başlığı.
export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobil — tətbiq ekran başlığı */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5 md:hidden">
        <BackButton />
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-brand-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 md:py-8">
        {/* Masaüstü — böyük başlıq */}
        <div className="mb-6 hidden md:block">
          <h1 className="text-3xl font-bold text-brand-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { useLang } from "@/context/lang-context";

/**
 * AXTARIŞ SƏHNƏSİ — `/products` nəticə gözləyərkən görünən tam ekran səth.
 *
 * NİYƏ TƏK FIRLANAN HALQA KİFAYƏT ETMİR: bu səth hazır DB siyahısı göstərmir,
 * sorğu CANLI gedir (`lib/partzona/search.ts`) və 1–3 saniyə çəkir. Amazon,
 * Temu, Trendyol kimi saytlar öz bazalarından oxuduqları üçün 200 ms-lik
 * gözləməni skeletlə örtürlər; bizim gözləmə isə uzundur və gizlədilməsi
 * ondan pisdir. Booking/Kayak məntiqi seçilib: gözləmə gizlədilmir, GÖRÜLƏN
 * İŞ DANIŞILIR — istifadəçi nə qədər iş getdiyini görəndə gözləməyə hazır olur.
 *
 * MƏRHƏLƏLƏR UYDURMA DEYİL — `importPartzonaSearch`-in real addımlarıdır:
 *   translateQuery → service.search → upsertProducts → adların tərcüməsi.
 * Tədarükçünün adı çəkilmir: `platform-visibility.ts`-dəki `SHOW_PLATFORM_UI`
 * qərarı mətnlərə də şamil olunur.
 *
 * KLİENT komponentidir, çünki iki yerdən çağırılır — `loading.tsx`
 * (naviqasiya fallback-ı) və `page.tsx`-dəki Suspense. Dili `useLang()`
 * kontekstindən alır: `loading.tsx`-də `cookies()` oxumaq onu dinamik edib
 * prefetch-i pozardı.
 */

/**
 * Hər mərhələnin BAŞLAMA anı (ms). Ölçülmüş orta hallardan götürülüb:
 * tərcümə ~0.7 s, kataloq sorğusu ~1.3 s, yazma ~0.9 s. Son mərhələ bitmir —
 * nəticə gələnə qədər "işləyir" vəziyyətində qalır ki, ekran heç vaxt
 * "hamısı bitdi, amma hələ də gözləyirik" ziddiyyəti göstərməsin.
 */
const STEP_START_MS = [0, 700, 2000, 2900];

/** Vəziyyət yeniləmə tezliyi — 120 ms göz üçün kifayət qədər hamardır. */
const TICK_MS = 120;

/**
 * Zolaq HEÇ VAXT 100%-ə çatmır və sabit sürətlə getmir: `1 - e^(-t/τ)`
 * əyrisi ilə 94%-ə YAXINLAŞIR. Səbəb — sorğunun nə qədər çəkəcəyini
 * bilmirik. Xətti zolaq ya vaxtından əvvəl sona çatıb ilişib qalır ("donub"
 * təsiri), ya da yarıda dayanır. Asimptot heç birini etmir: həmişə tərpənir,
 * amma sonu vəd etmir.
 */
const PROGRESS_CEILING = 94;
const PROGRESS_TAU_MS = 2600;

export function SearchLoader({ query }: { query?: string }) {
  const { t } = useLang();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Örtük ekranı tutduğu müddətdə arxa fonun sürüşməsi mənasızdır (görünmür,
    // amma barmaq/təkər işləyir və nəticələr gələndə səhifə gözlənilməz
    // yerdən başlayır). Söküləndə əvvəlki dəyər olduğu kimi qaytarılır.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // TƏK sayğac: həm zolaq, həm mərhələ ondan HESABLANIR. Hər mərhələ üçün
    // ayrıca `setTimeout` qurmaq eyni işi görürdü, amma vaxtlar bir-birindən
    // sürüşürdü və təmizləmə dörd yerə dağılırdı.
    const startedAt = performance.now();
    const id = window.setInterval(() => {
      setElapsed(performance.now() - startedAt);
    }, TICK_MS);

    return () => {
      window.clearInterval(id);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const steps = [
    t.searchLoader.steps.translate,
    t.searchLoader.steps.search,
    t.searchLoader.steps.collect,
    t.searchLoader.steps.finalize,
  ];

  // Hazırda işləyən mərhələ: başlama anı ötmüş SONUNCU addım.
  const activeStep = STEP_START_MS.reduce(
    (acc, startsAt, index) => (elapsed >= startsAt ? index : acc),
    0,
  );

  const progress = PROGRESS_CEILING * (1 - Math.exp(-elapsed / PROGRESS_TAU_MS));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background px-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="w-full max-w-sm text-center">
        {/* NİŞAN — sönük halo, üstündə fırlanan brend yayı, mərkəzdə SABİT
            lupa. Lupa qəsdən fırlanmır: fırlanan ikon "yüklənir" yox,
            "nəsə pozulub" kimi oxunur. */}
        <div className="relative mx-auto grid h-24 w-24 place-items-center">
          <span
            aria-hidden
            className="absolute inset-0 animate-pulse rounded-full bg-brand/10 blur-xl"
          />
          <span
            aria-hidden
            className="search-spin absolute inset-0 animate-spin rounded-full border-[3px] border-brand/15 border-t-brand"
          />
          <Search aria-hidden className="h-8 w-8 text-brand" />
        </div>

        {/* Sorğu mətni — YALNIZ `page.tsx` Suspense-indən gələndə göstərilir.
            `loading.tsx` prefetch olunduğu üçün ora söz ötürülmür; əks halda
            iki fallback arasında mətn "sıçrayardı". */}
        {query ? (
          <p className="mt-7 text-lg font-semibold text-foreground">
            <span className="text-brand">«</span>
            {query}
            <span className="text-brand">»</span>
          </p>
        ) : null}

        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          {t.searchLoader.subtitle}
        </p>

        {/* Gedişat zolağı */}
        <div
          aria-hidden
          className="mt-7 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Mərhələlər — solda hizalanır: mərkəzləşmiş siyahıda gözün hər sətri
            yenidən tapması lazım gəlir, dörd sətir üçün bu yorucudur. */}
        <ul className="mx-auto mt-6 space-y-2.5 text-left">
          {steps.map((label, index) => {
            const done = index < activeStep;
            const active = index === activeStep;
            return (
              <li key={label} className="flex items-center gap-3">
                <StepMark done={done} active={active} />
                <span
                  className={`text-sm transition-colors ${
                    active
                      ? "font-medium text-foreground"
                      : done
                        ? "text-foreground/55"
                        : "text-muted-foreground/45"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * Mərhələ nişanı — üç vəziyyət eyni 20×20 sahədə oturur ki, siyahı vəziyyət
 * dəyişəndə sağa-sola tərpənməsin.
 */
function StepMark({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground">
        <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (active) {
    return (
      <span
        aria-hidden
        className="search-spin h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brand/20 border-t-brand"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="h-5 w-5 shrink-0 rounded-full border-2 border-border"
    />
  );
}

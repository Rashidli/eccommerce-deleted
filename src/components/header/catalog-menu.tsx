"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FolderTree, LayoutGrid, X } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { categoryThumbSrc } from "@/lib/category-thumb";
import type { CategoryNodeDTO } from "@/lib/data/catalog";

/**
 * KATALOQ MEGA-MENYUSU — header-dəki "Kateqoriyalar" düyməsi ilə açılır.
 *
 * QURULUŞ: solda əsas kateqoriyalar (öz scroll-u), sağda seçilmişin alt
 * kateqoriyaları kart şəbəkəsi kimi (öz scroll-u). İki panel bir-birini
 * sürüşdürmür.
 *
 * AĞAC İKİ SƏVİYYƏLİDİR — mənbədə üçüncü səviyyə yoxdur (59 əsas + 778 alt).
 * Ona görə sağ tərəf "başlıq kartı + altında siyahı" yox, düz şəbəkə kimi
 * qurulub: olmayan səviyyə üçün boş siyahı qutuları çəkmək istifadəçiyə
 * "nəsə yüklənmədi" təsiri verərdi.
 *
 * HƏR İKİ PANELDƏ ELEMENT SƏTİRDİR — kiçik dairəvi ikon SOLDA, ad sağında.
 * Əvvəl sağ tərəf şaquli kart idi (üstdə 54px şəkil, altında mərkəzləşmiş ad):
 * şəkil sətrin özündən hündür olduğu üçün göz adı yox, şəkli oxuyurdu, halbuki
 * kateqoriya şəkilləri ümumi mövzu təsviridir — seçimi AD müəyyən edir. İkon
 * indi 30px-dir və hər iki paneldə eynidir.
 *
 * DATA TƏLƏB ÜZRƏ gəlir (`/api/categories/tree`) və bir dəfə çəkilir — ağac
 * 83 KB-dır, hər səhifənin HTML-inə qoymağın mənası yoxdur. HOVER ZAMANI HEÇ
 * BİR SORĞU GETMİR: bütün alt kateqoriyalar artıq yaddaşdadır, hover sadəcə
 * hansının göstəriləcəyini seçir.
 *
 * ────────────────────────────────────────────────────────────────────────
 * MENYU NİYƏ LƏNG İDİ (ölçülüb, təxmin deyil)
 * ────────────────────────────────────────────────────────────────────────
 * Günahkar data yox, `<Link>`-in AVTOMATİK PREFETCH-i idi. Next-də prefetch
 * susmaya görə "auto"-dur: link görünüş sahəsinə düşən kimi marşrut fonda
 * çəkilir. "Maşınlar" kateqoriyasının 103 alt kateqoriyası var — hover edən
 * kimi 103 link birdən ekrana düşür və 103 RSC sorğusu başlayır.
 *
 * Ölçüldü: tək prefetch 0.13 s / 30 KB. Cəmi 20-si paralel gedəndə hər biri
 * 1.5 s-ə qalxır (2 nüvəli server doyur). 103-də server tam tıxanır — həm
 * menyu, həm də istifadəçinin əsl klikə cavabı gecikir.
 *
 * HƏLL — üç qat:
 *   1. Menyudakı bütün linklərdə `prefetch={false}`. İstifadəçi 103-dən
 *      BİRİNƏ klikləyir; qalan 102-ni əvvəlcədən çəkmək saf itkidir.
 *   2. Əvəzində linkin ÜZƏRİNƏ gələndə `router.prefetch()` — istilik məhz
 *      klikləniləcək ünvana verilir, sorğu isə eyni anda bir dənədir.
 *   3. Sol siyahıda NİYYƏT GECİKMƏSİ (aşağıda `HOVER_INTENT_MS`).
 *
 * MOBİLDƏ tam ekran panel açılır (mega-menyu dar ekrana sığmır) və arxa
 * səhifənin scroll-u bağlanır.
 */
/**
 * Sol siyahıda kateqoriyanın seçilməsi üçün kursorun NƏ QƏDƏR dayanması lazımdır.
 *
 * Siyahının üstündən sürətlə keçəndə kursor 10-15 kateqoriyaya toxunur; gecikmə
 * o keçidlərin hamısını render etməyin qarşısını alır.
 *
 * ƏVVƏL 120 ms İDİ — İNDİ 45. O rəqəm hər hover-in 100-ə yaxın şəbəkə sorğusu
 * doğurduğu vaxtdan qalmışdı: onda gecikmə həqiqətən lazım idi. Prefetch
 * fırtınası aradan qalxandan sonra keçidin YEGANƏ qiyməti render-dir (~100
 * sətir, bir neçə millisaniyə), ona görə uzun gecikmə xeyirdən çox zərər verirdi
 * — panel qəsdən açılanda da gec açılırdı. 45 ms qavrayış həddindən (~100 ms)
 * xeyli aşağıdır, amma sürətli keçidin partlayışını hələ də yığır.
 */
const HOVER_INTENT_MS = 45;

export function CatalogMenu() {
  const { t } = useLang();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [tree, setTree] = useState<CategoryNodeDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/categories/tree");
      if (!res.ok) throw new Error(String(res.status));
      const data: { categories?: CategoryNodeDTO[] } = await res.json();
      const list = data.categories ?? [];
      setTree(list);
      // Menyu açılan kimi ilk kateqoriya seçili olsun — sağ tərəf boş qalmasın.
      setActiveId((prev) => prev ?? list[0]?.id ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Açıb-bağlama. Data məhz BURADA çəkilir, `useEffect`-də yox: çəkiliş
   * istifadəçi hərəkətinin nəticəsidir, kənar sistemlə sinxronizasiya deyil
   * (effektdə etsək lint haqlı olaraq "render zamanı setState" deyir).
   * Ağac bir dəfə yüklənir — ikinci açılışda sorğu getmir.
   */
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !tree && !loading) void load();
  };

  // Kənara klik + Escape ilə bağlanır.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Menyu bağlananda/komponent söküləndə asılı qalan hover taymeri olmasın.
  useEffect(() => {
    return () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    };
  }, []);

  // Mobil paneldə arxa səhifə sürüşməsin.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    // Yalnız dar ekranda — masaüstündə menyu səhifəni örtmür.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const active = tree?.find((c) => c.id === activeId) ?? null;

  const selectCategory = (id: string) => {
    setActiveId(id);
    // Kateqoriya dəyişəndə sağ panel yuxarıdan başlasın — əks halda istifadəçi
    // yeni siyahının ortasında peyda olur.
    rightRef.current?.scrollTo({ top: 0 });
  };

  const cancelHover = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  /** Hover — dərhal yox, kursor dayandıqdan sonra seçir (bax: HOVER_INTENT_MS). */
  const queueCategory = (id: string) => {
    cancelHover();
    hoverTimer.current = window.setTimeout(() => {
      hoverTimer.current = null;
      selectCategory(id);
    }, HOVER_INTENT_MS);
  };

  /** Klik gözləmir — niyyət artıq bəllidir. */
  const pickCategory = (id: string) => {
    cancelHover();
    selectCategory(id);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`hidden shrink-0 items-center justify-center gap-2 rounded-full text-base font-semibold transition-colors lg:flex lg:h-[60px] lg:w-[182px] ${
          open
            ? "bg-brand-ink text-white"
            : "bg-brand text-brand-foreground hover:opacity-90"
        }`}
      >
        {open ? <X className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
        {t.pages.categories}
      </button>

      {open && (
        <>
          {/* Arxa fon — masaüstündə yüngül tutqunluq, klik bağlayır.
              `fixed` olduğu üçün səhifəni yerindən tərpətmir. */}
          <div
            className="fixed inset-0 top-0 z-40 bg-black/25 lg:top-[138px]"
            aria-hidden
            onClick={() => setOpen(false)}
          />

          <div
            role="menu"
            aria-label={t.pages.categories}
            // Menyu daxilindəki İSTƏNİLƏN linkə klik menyunu bağlayır.
            // Əvvəl bu `useEffect(..., [pathname])` ilə edilirdi — effekt
            // içində setState lint qaydasını pozurdu və naviqasiya bitənə
            // qədər menyu açıq qalırdı.
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
            // Masaüstündə `fixed` — düyməyə YOX, EKRANA nisbətən yerləşir.
            // `absolute` olsaydı panel düymənin solundan başlayardı və 1600px
            // eni sağ kənardan daşardı. `left-10/right-10` səhifənin 40px-lik
            // kənarı ilə eyni xətdədir; `max-w` + `mx-auto` çox geniş ekranda
            // mərkəzləşdirir. `top`: 138px header + 14px ara.
            className={`
              fixed inset-0 z-50 flex flex-col bg-card
              lg:inset-x-10 lg:inset-y-auto lg:top-[152px]
              lg:mx-auto lg:h-[520px] lg:max-w-[1600px] lg:flex-row
              lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border
              lg:shadow-[0_18px_50px_rgba(0,0,0,0.14)]
              motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2
              motion-safe:duration-150
            `}
          >
            {/* Mobil başlıq — masaüstündə lazım deyil (kənara klik bağlayır). */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 lg:hidden">
              <span className="text-base font-semibold text-brand-ink">
                {t.pages.categories}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground/70"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {failed ? (
              <ErrorState onRetry={load} />
            ) : loading || !tree ? (
              <Skeleton />
            ) : (
              <>
                {/* SOL — əsas kateqoriyalar */}
                <ul onMouseLeave={cancelHover}
                  className="min-h-0 flex-1 overflow-y-auto border-border py-1.5 lg:w-[272px] lg:flex-none lg:border-r">
                  {tree.map((category) => {
                    const isActive = category.id === activeId;
                    const hasChildren = category.children.length > 0;
                    const row = (
                      <>
                        <Thumb src={category.image} alt={category.name} size={30} />
                        <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-medium leading-snug">
                          {category.name}
                        </span>
                        <ChevronRight
                          className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brand" : "text-muted-foreground"}`}
                        />
                      </>
                    );
                    const rowClass = `flex w-full items-center gap-3 px-4 py-2 text-left transition-colors lg:px-5 ${
                      isActive
                        ? "bg-secondary/70 text-brand"
                        : "text-foreground/85 hover:bg-secondary/50"
                    }`;

                    return (
                      <li key={category.id}>
                        {hasChildren ? (
                          <button
                            type="button"
                            // Masaüstündə hover, mobildə klik — ikisi də seçir.
                            // Hover gözləyir, klik gözləmir.
                            onMouseEnter={() => queueCategory(category.id)}
                            onClick={() => pickCategory(category.id)}
                            className={rowClass}
                          >
                            {row}
                          </button>
                        ) : (
                          // ALT KATEQORİYASI OLMAYAN kateqoriya (məs. "Enerji")
                          // birbaşa məhsullarına aparır. Seçilməyə buraxsaydıq
                          // sağ panel "alt kateqoriya yoxdur" yazıb dayanardı —
                          // çıxılmaz nöqtə.
                          <Link
                            href={category.href}
                            prefetch={false}
                            onMouseEnter={() => router.prefetch(category.href)}
                            className={rowClass}
                          >
                            {row}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* SAĞ — seçilmiş kateqoriyanın altları */}
                <div
                  ref={rightRef}
                  className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5 lg:px-4"
                >
                  {active && (
                    <>
                      <Link
                        href={active.href}
                        prefetch={false}
                        onMouseEnter={() => router.prefetch(active.href)}
                        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
                      >
                        {active.name} — {t.common.seeAll}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>

                      {active.children.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t.sections.noPlatformCategories}
                        </p>
                      ) : (
                        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                          {active.children.map((sub) => (
                            <li key={sub.id}>
                              <Link
                                href={sub.href}
                                prefetch={false}
                                onMouseEnter={() => router.prefetch(sub.href)}
                                className="group flex h-full items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-brand hover:bg-secondary/40"
                              >
                                <Thumb src={sub.image} alt={sub.name} size={30} />
                                <span className="line-clamp-2 min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-foreground/85 transition-colors group-hover:text-brand">
                                  {sub.name}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Dairəvi kateqoriya şəkli — yoxdursa ikon (uydurma şəkil çəkilmir).
 *
 * NİYƏ `next/image` DEYİL, ADİ `<img>`: menyuda eyni anda 100-ə yaxın 30px-lik
 * dairə görünür. `next/image` hər ölçü üçün serverdə `sharp` işə salır —
 * ölçüldü: soyuq keşdə bir şəkil 0.13-0.53 s, onlarla eyni anda gələndə isə
 * 2 nüvəli server doyur. Hazır 128px miniatür (`lib/images/category-image.ts`)
 * nginx-in birbaşa verdiyi statik fayldır: ~2 KB, sıfır emal.
 *
 * `loading="lazy"` görünməyən sətirlərin şəklini heç çəkmir — 103 alt
 * kateqoriyalı bölmədə eyni anda cəmi ekrandakılar yüklənir.
 *
 * Miniatür tapılmasa (köhnə şəkil, hələ `npm run categories:thumbs`
 * işlədilməyib) ikona düşürük — sınıq şəkil nişanı göstərmirik.
 */
function Thumb({ src, alt, size }: { src: string; alt: string; size: number }) {
  const [broken, setBroken] = useState(false);
  const thumb = categoryThumbSrc(src);

  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-brand/60 bg-secondary"
      style={{ width: size, height: size }}
    >
      {thumb && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- qəsdən: bax yuxarıdakı izaha
        <img
          src={thumb}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <FolderTree className="h-1/2 w-1/2 text-brand/70" />
      )}
    </span>
  );
}

/** Yüklənmə — real düzülüşü təqlid edir ki, data gələndə sıçrayış olmasın. */
function Skeleton() {
  return (
    <>
      <div className="min-h-0 flex-1 space-y-1.5 border-border p-4 lg:w-[272px] lg:flex-none lg:border-r lg:px-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <span className="h-[30px] w-[30px] shrink-0 animate-pulse rounded-full bg-muted" />
            <span className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1 p-3.5 lg:px-4">
        <span className="mb-3 block h-3.5 w-40 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2"
            >
              <span className="h-[30px] w-[30px] shrink-0 animate-pulse rounded-full bg-muted" />
              <span className="h-3 flex-1 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid flex-1 place-items-center p-10 text-center">
      <div>
        <p className="text-sm font-medium text-foreground">
          Kateqoriyalar yüklənmədi
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
        >
          Yenidən cəhd et
        </button>
      </div>
    </div>
  );
}

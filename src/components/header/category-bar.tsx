"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { getCategoryIcon } from "@/lib/category-icon";
import { categoryThumbSrc } from "@/lib/category-thumb";
import { useCategoryList } from "@/lib/use-category-list";
import type { HomeCategoryDTO } from "@/lib/data/catalog";

/**
 * KATEQORİYA ZOLAĞI — axtarış sətrinin altında, Instagram "story" üslubunda.
 *
 * Kateqoriyalar DB-dən gəlir (qayda #4) və seçilmiş platformaya görə dəyişir
 * (`useCategoryList` — mobil menyu ilə eyni məntiq).
 *
 * NİYƏ DAİRƏ VƏ NİYƏ TƏK BURADA: kateqoriyalar əvvəl həm header-də mətn
 * həblərində, həm də ana səhifədə ayrıca bölmədə göstərilirdi — eyni siyahı
 * iki yerdə. İndi tək giriş nöqtəsi budur: şəkilli dairə daha tez tanınır və
 * ana səhifədə şaquli yer boşalır.
 *
 * ALT KATEQORİYA DROPDOWN-U SİLİNDİ: story dairəsinin üstünə gələndə menyu
 * açmaq metaforanı pozurdu (story-yə toxunulur, üstündə dayanılmır). Alt
 * kateqoriyalar İTMİR — kateqoriya səhifəsinin sol paneli onları göstərir
 * (`getSidebarSubcategories` → `products/page.tsx`).
 *
 * SÜRÜŞDÜRMƏ — NİYƏ NATİV SCROLL, EMBLA DEYİL:
 * Mobildə barmaqla sürüşdürmə brauzerin öz scroll-udur — inersiya, kənar
 * effekti və `snap` pulsuz gəlir; JS karuseli bunları təqlid etməyə çalışır və
 * heç vaxt tam eyni olmur. Masaüstündə isə siçanla üfüqi scroll rahat deyil,
 * ona görə YALNIZ orada ox düymələri əlavə olunub (`md:` və yuxarı).
 */
export function CategoryBar({
  categories,
  platformCategories,
}: {
  categories: HomeCategoryDTO[];
  platformCategories?: Record<string, HomeCategoryDTO[]>;
}) {
  const { t } = useLang();
  const pathname = usePathname();
  const { list } = useCategoryList(categories, platformCategories);

  const trackRef = useRef<HTMLUListElement>(null);
  // Başlanğıc fərziyyə: siyahı əvvəldədir, ona görə yalnız sağa getmək olar.
  // Ölçmə mount-dan sonra `rAF`-də dəqiqləşdirilir (aşağıda).
  const [edges, setEdges] = useState({ left: false, right: true });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({
      left: el.scrollLeft > 4,
      // 4px dözüm: brauzerlər kəsr piksel qaytarır və ox sonda titrəyirdi.
      right: el.scrollLeft < max - 4,
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // İlk ölçmə düzülüşdən SONRA — effekt gövdəsində birbaşa `setState`
    // çağırmaq həm lint qaydasını pozur, həm də `scrollWidth` hələ son
    // dəyərində olmaya bilər.
    const frame = requestAnimationFrame(measure);

    el.addEventListener("scroll", measure, { passive: true });
    // Pəncərə ölçüsü dəyişəndə oxların lazım olub-olmadığı da dəyişir.
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  /** Bir "səhifə" — görünən enin 80%-i, ki sərhəddəki element gözdən qaçmasın. */
  const nudge = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (list.length === 0) return null;

  return (
    // Kart: səhifə kənarından 40px (container-fluid), header-dən 20px aşağı.
    <div className="container-fluid mt-5">
      <div className="group/bar relative rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] md:h-[124px]">
        <Arrow side="left" show={edges.left} onClick={() => nudge(-1)} label={t.common.prev} />
        <Arrow side="right" show={edges.right} onClick={() => nudge(1)} label={t.common.next} />

        {/* Tək sətir, üfüqi sürüşən; scrollbar gizlidir. `snap` mobildə
            dairələrin yarımçıq dayanmasının qarşısını alır. */}
        <ul
          ref={trackRef}
          className="flex h-full snap-x items-center gap-3.5 overflow-x-auto px-4 py-3.5 scrollbar-hide md:gap-4 md:px-6 md:py-0"
        >
          {list.map((category) => (
            <StoryItem
              key={category.key}
              href={category.href}
              name={category.name}
              nameEn={category.nameEn}
              itemKey={category.key}
              img={category.img}
              // Sorğu parametrli linklərdə (platforma kateqoriyaları) aktivlik
              // yoxlanmır — əks halda hamısı `/products`-a uyğun gəlib eyni
              // anda aktiv görünərdi.
              active={!category.href.includes("?") && pathname === category.href}
            />
          ))}

          {/* Endirim — kataloq kateqoriyası deyil, ayrıca səthdir: şəkli yox,
              ikonu var və siyahının sonunda dayanır. */}
          <StoryItem
            href="/sale"
            name={t.cat.sale}
            itemKey="sale"
            img=""
            active={pathname === "/sale"}
            accent
          />
        </ul>
      </div>
    </div>
  );
}

/**
 * Sürüşdürmə oxu — YALNIZ masaüstündə (`hidden md:grid`).
 *
 * Mobildə göstərilmir: barmaqla sürüşdürmə onsuz da təbiidir və 40px-lik
 * düymə dar ekranda dairələrin üstünü örtərdi.
 *
 * Sərhəddə `pointer-events-none` + şəffaflıq: düymə YOX OLMUR, sönür — yerində
 * qalır və zolaq sürüşəndə düzülüş tərpənmir.
 */
function Arrow({
  side,
  show,
  onClick,
  label,
}: {
  side: "left" | "right";
  show: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      tabIndex={show ? 0 : -1}
      className={`absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-foreground/70 shadow-md transition-opacity md:grid hover:bg-secondary hover:text-foreground ${
        side === "left" ? "left-1.5" : "right-1.5"
      } ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {side === "left" ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </button>
  );
}

function StoryItem({
  href,
  name,
  nameEn,
  itemKey,
  img,
  active,
  accent = false,
}: {
  href: string;
  name: string;
  nameEn?: string;
  itemKey: string;
  img: string;
  active: boolean;
  /** Endirim kimi xüsusi səthlər — həmişə brend halqası ilə. */
  accent?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  // Şəkil yoxdursa ikona düşürük — dairə boş qalmır, uydurma şəkil də çəkilmir.
  //
  // `createElement` QƏSDƏNDİR, `const Icon = ...` + `<Icon />` yox: sonuncuda
  // lint (`react-hooks/static-components`) haqlı olaraq render zamanı komponent
  // yaradıldığını bildirir — belə komponent hər render-də yenidən qurulur.
  const icon = createElement(getCategoryIcon(itemKey, name, nameEn), {
    className: "h-6 w-6",
  });
  // Miniatür yoxdursa (köhnə şəkil) `onError` ikona düşürür — sınıq şəkil
  // nişanı göstərmirik.
  const thumb = categoryThumbSrc(img);
  return (
    <li className="shrink-0 snap-start">
      <Link
        href={href}
        className="group flex w-[72px] flex-col items-center gap-1.5 md:w-[84px]"
      >
        {/* Dairə 56×56, ətrafında 2px brend çərçivəsi. Çərçivə ilə şəkil
            arasında 2px fon boşluğu var — Instagram halqasının ritmi budur;
            boşluqsuz çərçivə şəklə yapışır və "story" oxunmur. */}
        <span
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-full p-[2px] transition-colors ${
            active || accent ? "bg-brand" : "bg-brand/45 group-hover:bg-brand"
          }`}
        >
          <span className="h-full w-full rounded-full bg-card p-[2px]">
            {thumb && !broken ? (
              <span className="relative block h-full w-full overflow-hidden rounded-full bg-secondary">
                {/* ADİ `<img>` — QƏSDƏN.
                    Zolaqda 59 dairə var və hamısı eyni anda görünür.
                    `next/image` hər biri üçün serverdə `sharp` işə salır:
                    ölçüldü, soyuq keşdə şəkil başına 0.13-0.53 s, 2 nüvəli
                    serverdə isə hamısı birdən gələndə səhifə ilişirdi.
                    Hazır 128px miniatür (`lib/images/category-image.ts`)
                    nginx-in birbaşa verdiyi ~2 KB statik fayldır. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- bax yuxarıdakı izaha */}
                <img
                  src={thumb}
                  alt={name}
                  width={56}
                  height={56}
                  loading="lazy"
                  decoding="async"
                  onError={() => setBroken(true)}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </span>
            ) : (
              <span className="grid h-full w-full place-items-center rounded-full bg-secondary text-brand">
                {icon}
              </span>
            )}
          </span>
        </span>

        <span
          className={`line-clamp-2 w-full text-center text-[11px] leading-tight transition-colors ${
            active
              ? "font-semibold text-brand"
              : "text-foreground/75 group-hover:text-foreground"
          }`}
        >
          {name}
        </span>
      </Link>
    </li>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Search, X, FolderTree } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/context/lang-context";
import {
  useSearch,
  ALL_PLATFORMS,
  SEARCH_INPUT_ATTR,
  type Platform,
} from "@/context/search-context";
import { PlatformChip } from "@/components/platform-chip";
import { SHOW_PLATFORM_UI } from "@/lib/platform-visibility";
import type { HomeCategoryDTO } from "@/lib/data/catalog";

/**
 * AXTARIŞ BARI — axtarış birbaşa BURADAN aparılır.
 *
 * Əvvəl input `readOnly` idi və klik tam ekran dialoq açırdı. Dialoq eyni
 * inputu təkrar göstərməkdən başqa heç nə etmirdi (müştəri: "bu popup yeni
 * nəsə etmir"), üstəlik nəticə səhifəsində yazılan söz itirdi. İndi:
 *   · input əsl inputdur, Enter və ya düymə axtarır;
 *   · nəticə səhifəsində `?q` dəyəri inputda QALIR;
 *   · kateqoriya təklifləri dialoq yerinə kiçik açılan siyahıda göstərilir.
 */

/** Axtarış üçün normallaşdırma — "köynək" yazanda "Köynəklər" tapılsın. */
function norm(text: string): string {
  return text
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

interface SearchBarProps {
  platform: Platform;
  onPlatformChange: (platform: Platform) => void;
  /** Daxili kateqoriyalar ("hamısı" seçiləndə). */
  categories?: HomeCategoryDTO[];
  /** Platformanın əsas kateqoriyaları. */
  platformCategories?: Record<string, HomeCategoryDTO[]>;
  /** Platformanın alt kateqoriyaları — { valideynId: [...] }. */
  platformSubcategories?: Record<string, Record<string, HomeCategoryDTO[]>>;
  /** Mobil variantda platforma tabları gizlədilir (yer çatmır). */
  compact?: boolean;
}

export function SearchBar({
  platform,
  onPlatformChange,
  categories = [],
  platformCategories,
  platformSubcategories,
  compact = false,
}: SearchBarProps) {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Platformalar DB-dən (yalnız aktivlər) — SearchProvider vasitəsilə.
  const { platforms } = useSearch();

  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [focused, setFocused] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  /**
   * URL-dəki `?q` inputa yazılır — nəticə səhifəsində axtarılan söz görünsün
   * (və geri düyməsi/paylaşılan link də düzgün işləsin).
   *
   * ŞƏRT VACİBDİR: `q` OLMAYAN səhifəyə keçəndə input TƏMİZLƏNMİR. Əvvəl
   * şərtsiz idi və təklifdən kateqoriyaya keçəndə (`/category/...`, orada `q`
   * yoxdur) yazı dərhal silinirdi — istifadəçiyə "üstünə vururam, input
   * dolmur" kimi görünürdü.
   */
  useEffect(() => {
    if (urlQuery) setQuery(urlQuery);
  }, [urlQuery]);

  const submit = (value?: string) => {
    const q = (value ?? query).trim();
    if (!q) return;
    const params = new URLSearchParams({ q });
    // Platforma UI-ı gizlidirsə ünvana da yazılmır — istifadəçi seçim
    // etmədiyi bir şeyi linkdə görməməlidir (server defolta düşür).
    if (SHOW_PLATFORM_UI && platform !== ALL_PLATFORMS) {
      params.set("platform", platform);
    }
    setFocused(false);
    router.push(`/products?${params.toString()}`);
  };

  // Seçilmiş platformanın bütün kateqoriyaları (əsas + alt) — yazdıqca süzülür.
  const allCategories = useMemo<HomeCategoryDTO[]>(() => {
    if (platform === ALL_PLATFORMS) return categories;
    const main = platformCategories?.[platform] ?? [];
    const subs = Object.values(platformSubcategories?.[platform] ?? {}).flat();
    return [...main, ...subs];
  }, [platform, categories, platformCategories, platformSubcategories]);

  /**
   * Uyğun kateqoriyalar.
   *
   * Dedup AD üzrədir, `href` üzrə YOX. Əvvəl href-lə edilirdi və eyni adlı
   * ("Köynəklər") kateqoriya fərqli valideynlərdən 5 dəfə alt-alta düşürdü —
   * istifadəçi üçün hamısı eyni sətir kimi görünür, seçim mənasızlaşır.
   * İlk uyğun gələn saxlanılır.
   */
  const matches = useMemo(() => {
    const q = norm(query.trim());
    if (q.length < 2) return [];
    const seen = new Set<string>();
    return allCategories
      .filter((c) => {
        const key = norm(c.name);
        if (seen.has(key)) return false;
        const hit = key.includes(q) || norm(c.nameEn ?? "").includes(q);
        if (hit) seen.add(key);
        return hit;
      })
      .slice(0, 6);
  }, [query, allCategories]);

  const showSuggestions = focused && matches.length > 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-4xl flex-1">
      <div className="flex w-full items-center gap-1 rounded-full border border-border bg-secondary/60 py-1.5 pl-2 pr-2 transition-colors focus-within:border-brand focus-within:bg-background">
        {/* Görünən platforma tabları — brend logoları ilə.
            Tək platforma qaldığı üçün seçici gizlidir (SHOW_PLATFORM_UI):
            bir seçimli filtr seçim deyil, sadəcə yer tutur. */}
        {SHOW_PLATFORM_UI && !compact && (
          <>
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              {platforms.map((p) => (
                <PlatformChip
                  key={p.key}
                  platformKey={p.key}
                  label={p.name}
                  active={platform === p.key}
                  onClick={() => onPlatformChange(p.key)}
                />
              ))}
            </div>
            <span className="hidden h-5 w-px shrink-0 bg-border sm:block" />
          </>
        )}

        <input
          // `focusSearch()` bu nişanla tapır. Masaüstü və mobil variant EYNİ
          // anda DOM-dadır (biri CSS ilə gizlidir), ona görə unikal `id` yox,
          // atribut işlədilir — fokus GÖRÜNƏN olana verilir.
          {...{ [SEARCH_INPUT_ATTR]: "" }}
          type="search"
          value={query}
          placeholder={t.common.search}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          // `onBlur` dərhal bağlasa, təklifə klik qeydə alınmır — ona görə
          // kiçik gecikmə ilə bağlanır.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setFocused(false);
          }}
          aria-label={t.common.searchTitle}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t.common.close}
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          aria-label={t.common.searchTitle}
          onClick={() => submit()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {/* Uyğun KATEQORİYALAR — dialoq yerinə kiçik açılan siyahı */}
      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t.pages.categories}
          </p>
          <ul className="max-h-72 overflow-y-auto pb-2">
            {matches.map((c) => (
              <li key={c.href}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    // Seçilən kateqoriyanın adı inputda QALIR — istifadəçi
                    // nəyi seçdiyini görsün və üstündə redaktə edə bilsin.
                    setQuery(c.name);
                    setFocused(false);
                    router.push(c.href);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/10 text-brand">
                    {c.img ? (
                      <Image
                        src={c.img}
                        alt={c.name}
                        fill
                        sizes="32px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <FolderTree className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {c.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

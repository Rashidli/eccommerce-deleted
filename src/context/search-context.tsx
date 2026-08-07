"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { PlatformDTO } from "@/lib/data/catalog";

/** Platforma açarı (DB Platform.key) və ya "all". */
export type Platform = string;
export const ALL_PLATFORMS = "all";

/**
 * Seçilmiş platforma COOKIE-də saxlanılır (localStorage-də yox) — çünki serverin
 * də onu görməsi lazımdır. Əks halda səhifə yenilənəndə başlıqda bir platforma,
 * məhsullarda başqası görünürdü (`src/lib/server-platform.ts` bunu oxuyur).
 */
const PLATFORM_COOKIE = "ecommerce-platform";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string): void {
  // 1 il, bütün sayt üzrə. `SameSite=Lax` — normal naviqasiyada göndərilir.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Axtarış inputunu nişanlayan atribut — `focusSearch()` onu tapır.
 *
 * `id` DEYİL: masaüstü və mobil axtarış barı eyni anda DOM-dadır (biri CSS ilə
 * gizlədilir), unikal id qoymaq mümkün olmazdı. Atributla hər ikisi tapılır və
 * fokus GÖRÜNƏN olana verilir.
 */
export const SEARCH_INPUT_ATTR = "data-site-search";

interface SearchContextValue {
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  /** DB-dən gələn AKTİV platformalar (amazon söndürülü olduğu üçün burada yoxdur). */
  platforms: PlatformDTO[];
  /**
   * İstənilən yerdən axtarışa keç (istəyə görə platforma seçili gəlir).
   *
   * Əvvəl bu, tam ekran dialoq açırdı. Dialoq ləğv edildi (müştəri: "bu popup
   * yeni nəsə etmir") — indi başlıqdakı ƏSL axtarış inputu fokuslanır.
   */
  focusSearch: (platform?: Platform) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({
  platforms,
  children,
  initialPlatform,
}: {
  platforms: PlatformDTO[];
  children: React.ReactNode;
  /** Serverin cookie-dən oxuduğu seçim — ilk render dərhal düzgün gəlsin deyə. */
  initialPlatform?: string;
}) {
  // Defolt: ilk aktiv platforma; heç biri yoxdursa "all".
  // Server və ilk render EYNİ dəyəri verməlidir (hydration uyğunsuzluğu olmasın),
  // ona görə yaddaşdan oxumaq render zamanı yox, `useEffect`-də baş verir.
  const [platform, setPlatformState] = useState<Platform>(
    initialPlatform ?? platforms[0]?.key ?? ALL_PLATFORMS,
  );

  useEffect(() => {
    const valid = (p: string | null): p is Platform =>
      !!p && (p === ALL_PLATFORMS || platforms.some((x) => x.key === p));

    // 1) URL həmişə üstündür — paylaşılan linkdə göndərənin seçimi qorunur.
    const fromUrl = new URLSearchParams(window.location.search).get("platform");
    if (valid(fromUrl)) {
      setPlatformState(fromUrl);
      writeCookie(PLATFORM_COOKIE, fromUrl);
      return;
    }

    // 2) URL-də yoxdursa — istifadəçinin əvvəlki seçimi bərpa olunur.
    const saved = readCookie(PLATFORM_COOKIE);
    if (valid(saved)) setPlatformState(saved);
  }, [platforms]);

  const setPlatform = useCallback((p: Platform) => {
    setPlatformState(p);
    writeCookie(PLATFORM_COOKIE, p);
  }, []);

  const focusSearch = useCallback(
    (p?: Platform) => {
      if (p) setPlatform(p);
      // Başlıq `sticky`-dir, amma səhifə aşağıda olsa fokus görünməyə bilər —
      // ona görə əvvəl yuxarı sürüşdürülür.
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Bir tik gecikmə: platforma dəyişikliyi render olunandan sonra fokus.
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>(
          `input[${SEARCH_INPUT_ATTR}]`,
        );
        // `offsetParent === null` → element gizlidir (display:none).
        const visible = [...inputs].find((el) => el.offsetParent !== null);
        visible?.focus();
        visible?.select();
      }, 0);
    },
    [setPlatform],
  );

  return (
    <SearchContext.Provider
      value={{ platform, setPlatform, platforms, focusSearch }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}

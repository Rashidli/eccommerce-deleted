"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { type Lang, dict, DEFAULT_LANG } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (typeof dict)[Lang];
}

const LangContext = createContext<LangContextValue | null>(null);

const STORAGE_KEY = "ecommerce-lang";

// SSR körpüsü — server bu cookie-ni oxuyur (@/lib/server-lang) və dinamik mətnləri
// həmin dilə görə lokallaşdırır. Client tərəf onu localStorage ilə birlikdə yazır.
function writeLangCookie(lang: Lang) {
  document.cookie = `${STORAGE_KEY}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const router = useRouter();

  // İlk yükləmədə yadda saxlanmış dili oxu və cookie-ni sinxronla
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && saved in dict) {
      setLangState(saved);
      document.documentElement.lang = saved;
      writeLangCookie(saved);
    }
  }, []);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
      writeLangCookie(next);
      // Server komponentləri (DB-dən lokallaşan məhsul/kateqoriya mətnləri) yenidən render olsun.
      router.refresh();
    },
    [router],
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t: dict[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

// Komponentlərdə istifadə üçün hook
export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

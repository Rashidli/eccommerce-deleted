"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Globe } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { LANGS } from "@/lib/i18n";

/**
 * DİL SEÇİCİ (AZ · EN · RU).
 *
 * Header-də 60×60 dairənin İÇİNDƏ dayanır. Əvvəl `Globe + "AZ" + ChevronDown`
 * yan-yana idi və üçü birlikdə dairəyə sığmırdı — ox kənara daşırdı. İndi
 * dairədə YALNIZ dil kodu var: kod özü onsuz da hər şeyi deyir, qlobus ikonu
 * isə açılan siyahının başlığındadır.
 */
export function LangSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Kənara klikləyəndə və Escape ilə bağlanır.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
  }, []);

  const current = LANGS.find((l) => l.code === lang);

  return (
    <div className="relative h-full w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Dil / Language"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold uppercase transition-colors md:h-full md:w-full ${
          open ? "text-brand" : "text-foreground/75 hover:text-foreground"
        }`}
      >
        {current?.label ?? lang}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <p className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            Dil / Language
          </p>
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === lang}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-muted ${
                l.code === lang ? "font-semibold text-brand" : "text-foreground"
              }`}
            >
              {l.name}
              {l.code === lang && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

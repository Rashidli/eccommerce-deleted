"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { LANGS } from "@/lib/i18n";

// Dil seçici (AZ · EN · RU)
export function LangSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Kənara klikləyəndə bağla
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LANGS.find((l) => l.code === lang);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Dil / Language"
        className="flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
      >
        <Globe className="h-5 w-5" />
        <span className="hidden sm:inline">{current?.label}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-muted ${
                l.code === lang ? "text-brand font-semibold" : "text-foreground"
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

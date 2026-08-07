"use client";

import { Check, Globe } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useLang } from "@/context/lang-context";
import { LANGS } from "@/lib/i18n";

export default function SettingsPage() {
  const { t, lang, setLang } = useLang();

  return (
    <PageShell title={t.pages.settings}>
      <div className="max-w-md rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="h-4 w-4 text-brand" />
          {LANGS.map((l) => l.label).join(" · ")}
        </div>
        <div className="space-y-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm transition-colors hover:bg-muted ${
                l.code === lang ? "font-semibold text-brand" : "text-foreground"
              }`}
            >
              {l.name}
              {l.code === lang && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

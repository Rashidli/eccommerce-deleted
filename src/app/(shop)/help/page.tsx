"use client";

import { PageShell } from "@/components/page-shell";
import { perks } from "@/lib/mock-data";
import { useLang } from "@/context/lang-context";

export default function HelpPage() {
  const { t } = useLang();

  return (
    <PageShell title={t.pages.help} subtitle={t.sections.platformsSub}>
      <div className="grid gap-4 sm:grid-cols-2">
        {perks.map(({ icon: Icon, key }) => (
          <div
            key={key}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">{t.perks[key].title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.perks[key].sub}</p>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

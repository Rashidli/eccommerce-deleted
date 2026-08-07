"use client";

import { perks } from "@/lib/mock-data";
import { useLang } from "@/context/lang-context";

export function PerksSection() {
  const { t } = useLang();

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-0 sm:divide-x divide-border rounded-xl bg-muted p-3 sm:p-4 md:grid-cols-4">
      {perks.map(({ icon: Icon, key }) => (
        <div
          key={key}
          className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-0 rounded-lg sm:rounded-none bg-card/50 sm:bg-transparent first:pl-2 sm:first:pl-0 last:pr-2 sm:last:pr-0 group cursor-pointer"
        >
          <div className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-lg bg-gradient-to-br from-card to-muted text-brand shadow-sm transition-all duration-300 group-hover:from-brand group-hover:to-brand group-hover:text-brand-foreground group-hover:shadow-md group-hover:scale-110">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.75} />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              {t.perks[key].title}
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
              {t.perks[key].sub}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

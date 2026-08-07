"use client";

import { ArrowRight } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { useSearch } from "@/context/search-context";
import type { PlatformDTO } from "@/lib/data/catalog";
import { SectionHeading } from "./section-heading";

// Qradiyentlər literal saxlanır ki, Tailwind onları tanısın
const GRADIENTS: Record<string, string> = {
  "1688": "from-orange-400 to-rose-500",
  taobao: "from-pink-500 to-fuchsia-500",
  amazon: "from-sky-500 to-indigo-500",
  // OTAPI platformaları (aktivləşdirildikdə)
  tmall: "from-red-500 to-orange-500",
  aliexpress: "from-red-600 to-rose-600",
  alibaba: "from-amber-500 to-orange-600",
  jd: "from-red-500 to-rose-700",
  pinduoduo: "from-rose-500 to-red-600",
};

// Aqreqator konsepsiyasını vurğulayan platforma showcase-i — DB-dən (aktiv platformalar).
export function PlatformsStrip({ platforms }: { platforms: PlatformDTO[] }) {
  const { t } = useLang();
  const { focusSearch } = useSearch();

  return (
    <section>
      <SectionHeading
        title={t.sections.platforms}
        subtitle={t.sections.platformsSub}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((p) => (
          <button
            key={p.key}
            onClick={() => focusSearch(p.key)}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${
              GRADIENTS[p.key] ?? "from-slate-500 to-slate-700"
            } p-6 text-left text-white shadow-sm transition-transform hover:-translate-y-1`}
          >
            {/* dekorativ dairə */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15" />

            <div className="relative">
              <p className="text-2xl font-extrabold tracking-tight">{p.name}</p>
              <p className="mt-1 text-sm text-white/85">{p.tagline}</p>

              <div className="mt-6 flex items-center justify-end">
                <span className="inline-flex items-center gap-1 text-sm font-semibold transition-transform group-hover:translate-x-1">
                  {t.sections.explore}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

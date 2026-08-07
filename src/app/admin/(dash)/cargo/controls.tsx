"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import {
  toggleCargoBranch,
  toggleCargoCompany,
  syncCargoBranches,
} from "./actions";

/**
 * Aktivlik açarı — optimist, server rədd etsə geri qayıdır.
 * Şirkət və filial üçün eyni komponent; fərq yalnız çağırılan action-dadır.
 */
export function ActiveToggle({
  kind,
  id,
  checked,
  label,
}: {
  kind: "company" | "branch";
  id: string;
  checked: boolean;
  label: string;
}) {
  const [on, setOn] = useState(checked);
  const [pending, startTransition] = useTransition();

  const handle = () => {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        if (kind === "company") await toggleCargoCompany(id, next);
        else await toggleCargoBranch(id, next);
      } catch {
        setOn(!next);
      }
    });
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label} aktiv`}
      onClick={handle}
      disabled={pending}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-brand" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/**
 * Filialları şirkətin API-sindən çəkir.
 *
 * Nəticə AÇIQ göstərilir — neçəsi yazıldı, neçəsinin rayonu tapılmadı.
 * Səssiz "uğurlu" mesaj yanıldıcı olardı: rayonu tapılmayan filial üçün
 * çatdırılma tarifi hesablana bilmir, admin bunu görməlidir.
 */
export function SyncBranchesButton({
  companyKey,
  disabled,
}: {
  companyKey: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const handle = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        const r = await syncCargoBranches(companyKey);
        if (!r.ok) {
          setMsg(
            r.error === "no_api_url"
              ? "API ünvanı boşdur"
              : r.error === "driver_unsupported"
                ? "Bu driver filial çəkməni dəstəkləmir"
                : `Xəta: ${r.error}`,
          );
          return;
        }
        setMsg(
          `${r.saved} filial yazıldı` +
            (r.unmatched ? ` · ${r.unmatched} rayonsuz` : ""),
        );
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Xəta");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <button
        type="button"
        onClick={handle}
        disabled={pending || disabled}
        title={disabled ? "Əvvəlcə API ünvanını yazın" : "Filialları çək"}
        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-brand hover:text-brand-foreground disabled:opacity-40"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        Filialları sinxronla
      </button>
    </div>
  );
}

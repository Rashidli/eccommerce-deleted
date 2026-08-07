"use client";

import { useActionState } from "react";
import { IdCard, Lock, Check, BadgeCheck } from "lucide-react";
import { useLang } from "@/context/lang-context";
import {
  updateProfile,
  type ProfileState,
} from "@/app/(shop)/panel/profile/actions";

export type ProfileInitial = {
  fullName: string;
  email: string;
  phone: string;
  /** Boşdursa istifadəçi təyin edə bilər; doludursa YALNIZ-OXU. */
  fin: string;
};

export function ProfileForm({
  initial,
  customerCode,
}: {
  initial: ProfileInitial;
  /** `FOR000001` — sistem verir, istifadəçi dəyişə bilmir. */
  customerCode: string;
}) {
  const { t } = useLang();
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    {},
  );

  const errorText = state.error
    ? (t.pages as Record<string, string>)[state.error] ?? t.pages.fillFields
    : "";

  // FİN bir dəfə yazılır — səbəbi `profile/actions.ts`-də izah olunub.
  const finLocked = Boolean(initial.fin);

  return (
    <form action={formAction} className="max-w-lg space-y-6">
      {/* ---------- Şəxsi məlumat ---------- */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t.panel.profile}
        </h2>

        <Field label={t.panel.fullName}>
          <input
            name="fullName"
            type="text"
            required
            defaultValue={initial.fullName}
            className={inputClass}
          />
        </Field>

        {/* Email yalnız-oxu — dəyişdirilmir */}
        <Field label={t.pages.email}>
          <input
            type="email"
            defaultValue={initial.email}
            readOnly
            disabled
            className={readOnlyClass}
          />
        </Field>

        <Field label={t.panel.phone}>
          <input
            name="phone"
            type="tel"
            defaultValue={initial.phone}
            placeholder="+994 50 123 45 67"
            className={inputClass}
          />
        </Field>
      </section>

      {/* ---------- MÜŞTƏRİ KODU (yalnız oxunur) ----------
          Sistem verir, istifadəçi dəyişə bilmir — ona görə input deyil.
          Sifariş İspaniya anbarımıza məhz bu kodla düşür. */}
      <section className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
            <BadgeCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-ink">
              {t.panel.customerCode}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.panel.customerCodeHint}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
          <span className="flex-1 font-mono text-sm font-bold tracking-wider text-brand-ink">
            {customerCode}
          </span>
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      </section>

      {/* ---------- FİN ---------- */}
      <section className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
            <IdCard className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-ink">{t.panel.fin}</p>
            <p className="text-xs text-muted-foreground">{t.panel.finHint}</p>
          </div>
        </div>

        {finLocked ? (
          <>
            {/* Dəyər yalnız göstərilir — `name` YOXDUR, ona görə formada
                ümumiyyətlə göndərilmir. Server də onu ignor edir. */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
              <span className="flex-1 font-mono text-sm font-semibold tracking-wider text-brand-ink">
                {initial.fin}
              </span>
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{t.panel.finLocked}</p>
          </>
        ) : (
          <input
            name="fin"
            type="text"
            maxLength={7}
            pattern="[0-9A-Za-z]{7}"
            autoComplete="off"
            placeholder="5AB1C23"
            aria-label={t.panel.fin}
            className={`${inputClass} font-mono uppercase tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal`}
          />
        )}
      </section>

      {errorText && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorText}
        </p>
      )}
      {state.ok && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          {t.panel.profileSaved}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "…" : t.panel.save}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand";

const readOnlyClass =
  "w-full cursor-not-allowed rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

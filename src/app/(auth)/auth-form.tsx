"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail, Lock, User, Phone, LogIn, UserPlus, IdCard } from "lucide-react";
import { useLang } from "@/context/lang-context";
import { login, register, type AuthState } from "./actions";

// Login və register üçün ortaq forma. Rejim səhifədə sabitdir (toggle yox) —
// login/register ayrı-ayrı route-lardır, bir-birinə link ilə keçir.
export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const { t } = useLang();
  const isLogin = mode === "login";
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    isLogin ? login : register,
    {},
  );

  const errorText = state.error
    ? (t.pages as Record<string, string>)[state.error] ?? t.pages.fillFields
    : "";

  const otherHref = isLogin ? "/register" : "/login";
  const otherHrefWithNext =
    next ? `${otherHref}?next=${encodeURIComponent(next)}` : otherHref;

  return (
    <div className="w-full max-w-md shrink-0 rounded-2xl border border-border/70 bg-card/90 p-5 shadow-xl shadow-brand/10 backdrop-blur md:p-6">
      <div className="mb-4 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-purple-500 text-white shadow-lg shadow-brand/30">
          {isLogin ? (
            <LogIn className="h-6 w-6" />
          ) : (
            <UserPlus className="h-6 w-6" />
          )}
        </span>
        <h1 className="mt-3 text-xl font-bold text-brand-ink">
          {isLogin ? t.pages.loginTitle : t.pages.registerTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLogin ? t.pages.loginSub : t.pages.registerSub}
        </p>
      </div>

      {/* `key` — `defaultValue` YALNIZ ilk render-də tətbiq olunur. Xəta
          dəyişəndə forma yenidən qurulmalıdır ki, server qaytardığı dəyərlər
          input-lara düşsün (parol sahələri də təmizlənir — istənilən davranış). */}
      <form
        key={`${state.error ?? ""}:${state.values?.email ?? ""}`}
        className="space-y-3"
        action={formAction}
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {!isLogin && (
          <Field
            label={t.pages.name}
            icon={<User className="h-4 w-4 text-muted-foreground" />}
          >
            <input
              type="text"
              name="name"
              required
              // Xətadan sonra yazılanlar itməsin (server `state.values` qaytarır).
              defaultValue={state.values?.fullName ?? ""}
              placeholder="Ada Məmmədova"
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </Field>
        )}

        <Field
          label={t.pages.email}
          icon={<Mail className="h-4 w-4 text-muted-foreground" />}
        >
          <input
            type="email"
            name="email"
            required
            defaultValue={state.values?.email ?? ""}
            autoComplete="email"
            placeholder="name@mail.com"
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </Field>

        {!isLogin && (
          <Field
            label={t.pages.phone}
            icon={<Phone className="h-4 w-4 text-muted-foreground" />}
          >
            <input
              type="tel"
              name="phone"
              defaultValue={state.values?.phone ?? ""}
              autoComplete="tel"
              placeholder="+994 50 123 45 67"
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </Field>
        )}

        {/* FİN — qeydiyyatda MƏCBURİ. `required`/`pattern` yalnız rahatlıq
            üçündür; əsl yoxlama serverdədir (`actions.ts` → `parseFin`). */}
        {!isLogin && (
          <Field
            label={t.panel.fin}
            icon={<IdCard className="h-4 w-4 text-muted-foreground" />}
            hint={t.panel.finHint}
          >
            <input
              type="text"
              name="fin"
              required
              defaultValue={state.values?.fin ?? ""}
              maxLength={7}
              pattern="[0-9A-Za-z]{7}"
              autoComplete="off"
              placeholder="5AB1C23"
              className="w-full bg-transparent py-2 text-sm uppercase outline-none placeholder:normal-case"
            />
          </Field>
        )}

        <Field
          label={t.pages.password}
          icon={<Lock className="h-4 w-4 text-muted-foreground" />}
        >
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="••••••••"
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </Field>

        {!isLogin && (
          <Field
            label={t.pages.confirmPassword}
            icon={<Lock className="h-4 w-4 text-muted-foreground" />}
          >
            <input
              type="password"
              name="confirm"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </Field>
        )}

        {errorText && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorText}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-gradient-to-r from-brand to-purple-600 py-2.5 font-semibold text-brand-foreground shadow-lg shadow-brand/25 transition-transform active:scale-[0.98] hover:opacity-95 disabled:opacity-60"
        >
          {pending ? "…" : isLogin ? t.pages.signIn : t.pages.signUp}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {isLogin ? t.pages.noAccount : t.pages.haveAccount}{" "}
        <Link
          href={otherHrefWithNext}
          className="font-semibold text-brand hover:underline"
        >
          {isLogin ? t.pages.signUp : t.pages.signIn}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  /** Sahənin altında kiçik izah — məs. FİN formatı. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-brand">
        {icon}
        {children}
      </div>
      {hint && (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

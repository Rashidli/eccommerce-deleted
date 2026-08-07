"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock, Mail } from "lucide-react";
import { login, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Yoxlanılır…" : "Daxil ol"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          E-poçt
        </span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="email"
            type="email"
            autoComplete="username"
            autoFocus
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Parol
        </span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
      </label>

      {state.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

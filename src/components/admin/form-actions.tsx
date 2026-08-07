"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function SubmitButton({ children = "Yadda saxla" }: { children?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Saxlanılır…" : children}
    </button>
  );
}

export function CancelButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
    >
      Ləğv et
    </button>
  );
}

/**
 * Silmə düyməsi. Brauzerin confirm() dialoqu əvəzinə sətir içində təsdiq —
 * dialoq bütün səhifəni bloklayır.
 */
export function DeleteButton({
  action,
  id,
  compact = false,
}: {
  action: (formData: FormData) => void;
  id: string;
  compact?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Sil"
        className={
          compact
            ? "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            : "rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        }
      >
        {compact ? <Trash2 className="h-4 w-4" /> : "Sil"}
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-white"
      >
        Sil
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
      >
        Yox
      </button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  togglePlatformActive,
  toggleCategoryVisibility,
  updatePlatformBadge,
} from "./actions";

/**
 * Optimist açar — klik ediləndə dərhal dəyişir, server action arxada işləyir.
 * Xəta olsa əvvəlki vəziyyətə qayıdır (yalançı "yadda saxlanıldı" göstərməsin).
 */
function Switch({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: (next: boolean) => Promise<void>;
}) {
  const [on, setOn] = useState(checked);
  const [pending, startTransition] = useTransition();

  const handle = () => {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await onToggle(next);
      } catch {
        setOn(!next); // server qəbul etmədi — geri qaytar
      }
    });
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
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

/** Platformanı aktiv/deaktiv edən açar. */
export function PlatformToggle({
  platformKey,
  checked,
  label,
}: {
  platformKey: string;
  checked: boolean;
  label: string;
}) {
  return (
    <Switch
      checked={checked}
      label={label}
      onToggle={(next) => togglePlatformActive(platformKey, next)}
    />
  );
}

/** Kateqoriyanın nav / ana səhifə görünmə açarı. */
export function VisibilityToggle({
  id,
  field,
  checked,
  label,
}: {
  id: string;
  field: "showInNav" | "showOnHome";
  checked: boolean;
  label: string;
}) {
  return (
    <Switch
      checked={checked}
      label={label}
      onToggle={(next) => toggleCategoryVisibility(id, field, next)}
    />
  );
}

/**
 * Nişan rəngi redaktoru — iki rəng seçici (fon + mətn) və canlı önizləmə.
 * Dəyər `blur`-da yadda saxlanılır ki, hər sürüşdürmədə sorğu atılmasın.
 */
export function BadgeColorEditor({
  platformKey,
  label,
  initialBg,
  initialFg,
}: {
  platformKey: string;
  label: string;
  initialBg: string;
  initialFg: string;
}) {
  const [bg, setBg] = useState(initialBg);
  const [fg, setFg] = useState(initialFg);
  const [pending, startTransition] = useTransition();

  const save = (nextBg: string, nextFg: string) => {
    startTransition(async () => {
      try {
        await updatePlatformBadge(platformKey, nextBg, nextFg);
      } catch {
        // Server qəbul etmədi — əvvəlki rəngləri geri qaytarırıq.
        setBg(initialBg);
        setFg(initialFg);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-bold shadow"
        style={{ backgroundColor: bg, color: fg }}
      >
        {label}
      </span>
      <input
        type="color"
        value={bg}
        aria-label={`${label} fon rəngi`}
        disabled={pending}
        onChange={(e) => setBg(e.target.value)}
        onBlur={() => save(bg, fg)}
        className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent"
      />
      <input
        type="color"
        value={fg}
        aria-label={`${label} mətn rəngi`}
        disabled={pending}
        onChange={(e) => setFg(e.target.value)}
        onBlur={() => save(bg, fg)}
        className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent"
      />
    </div>
  );
}

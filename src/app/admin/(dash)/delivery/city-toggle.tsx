"use client";

import { useState, useTransition } from "react";
import { toggleCity } from "./actions";

/**
 * Şəhər aktivliyi — optimist açar.
 * Server qəbul etməsə əvvəlki vəziyyətə qayıdır (yalançı "saxlanıldı" olmasın).
 */
export function CityToggle({
  id,
  checked,
  label,
}: {
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
        await toggleCity(id, next);
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

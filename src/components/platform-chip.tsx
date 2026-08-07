"use client";

import { useState } from "react";

/**
 * Axtarışdakı platforma seçim çipi. Loqo `/platforms/{key}.svg`-dən gəlir;
 * yeni platformaların (tmall, aliexpress...) loqosu yoxdursa mətn nişanına düşür.
 */
export function PlatformChip({
  platformKey,
  label,
  active,
  onClick,
}: {
  platformKey: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [noLogo, setNoLogo] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`shrink-0 rounded-lg p-0.5 transition ${
        active
          ? "ring-2 ring-brand ring-offset-1 ring-offset-background"
          : "opacity-60 hover:opacity-100"
      }`}
    >
      {noLogo ? (
        <span className="block rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-foreground/80">
          {label}
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/platforms/${platformKey}.svg`}
          alt={label}
          onError={() => setNoLogo(true)}
          className="block h-6 w-auto rounded-md"
        />
      )}
    </button>
  );
}

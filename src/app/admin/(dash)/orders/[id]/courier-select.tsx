"use client";

import { useState } from "react";
import type { Courier } from "@/lib/couriers";

const INPUT =
  "w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand";

function Label({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Kargo şirkəti və filial — checkout-dakı kimi asılı seçimlər.
 * Bazada adlar saxlanır ("Kango", "Kango 28 May"), id-lər yox.
 */
export function CourierSelect({
  defaultCourier,
  defaultBranch,
  couriers,
}: {
  defaultCourier: string | null;
  defaultBranch: string | null;
  /** Şirkət/filial siyahısı BAZADAN gəlir — serverdən prop kimi ötürülür
   *  (client komponent birbaşa DB-yə gedə bilməz). */
  couriers: Courier[];
}) {
  const [courierName, setCourierName] = useState(defaultCourier ?? "");

  const courier = couriers.find((item) => item.name === courierName);
  const branches = courier?.branches ?? [];

  // Sifariş siyahıda olmayan filialla gəlibsə, dəyər itməsin deyə saxlanılır.
  const branchMissing =
    defaultBranch &&
    courierName === defaultCourier &&
    !branches.some((branch) => branch.name === defaultBranch);

  return (
    <>
      <Label label="Kargo şirkəti">
        <select
          name="courier"
          value={courierName}
          onChange={(event) => setCourierName(event.target.value)}
          className={INPUT}
        >
          <option value="">— seçilməyib —</option>
          {couriers.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name} · {item.note}
            </option>
          ))}
        </select>
      </Label>

      <Label label="Filial">
        <select
          name="branch"
          // Kargo dəyişəndə köhnə filial artıq uyğun gəlmir — açar sıfırlayır.
          key={courierName}
          defaultValue={courierName === defaultCourier ? (defaultBranch ?? "") : ""}
          disabled={!courier}
          className={`${INPUT} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <option value="">
            {courier ? "— seçilməyib —" : "Əvvəlcə kargo seçin"}
          </option>
          {branchMissing && (
            <option value={defaultBranch}>{defaultBranch}</option>
          )}
          {branches.map((branch) => (
            <option key={branch.id} value={branch.name}>
              {branch.name} — {branch.address}
            </option>
          ))}
        </select>
      </Label>
    </>
  );
}

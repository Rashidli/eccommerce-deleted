"use client";

import Link from "next/link";
import { Truck, Store, MapPin, Clock, Check, Plus } from "lucide-react";
import { useLang } from "@/context/lang-context";
import type { PanelAddress } from "@/lib/data/account";
import type { PickupPointDTO } from "@/lib/data/geo";
import type { DeliveryMethod } from "@/lib/shipping/local";

/**
 * ÇATDIRILMA ADDIMI — iki üsul:
 *
 *   kuryer  → biz çatdırırıq, müştəri ÜNVAN seçir; haqq ünvanın RAYONUNDAN
 *   pickup  → müştəri özü PUDO məntəqəsindən götürür; haqq məntəqədən
 *
 * Göstərilən qiymət yalnız MƏLUMAT üçündür — sifariş yaradılanda server
 * `quoteLocalDelivery` ilə yenidən hesablayır (client rəqəminə etibar yoxdur).
 */
export function DeliveryStep({
  method,
  onMethodChange,
  addresses,
  addressId,
  onAddressChange,
  pickupPoints,
  pickupPointId,
  onPickupChange,
  onNext,
}: {
  method: DeliveryMethod;
  onMethodChange: (m: DeliveryMethod) => void;
  addresses: PanelAddress[];
  addressId: string | null;
  onAddressChange: (id: string) => void;
  pickupPoints: PickupPointDTO[];
  pickupPointId: string | null;
  onPickupChange: (id: string) => void;
  onNext: () => void;
}) {
  const { t } = useLang();

  const ready =
    method === "courier" ? Boolean(addressId) : Boolean(pickupPointId);

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-brand-ink">
        {t.checkout.deliveryMethod}
      </h2>

      {/* Üsul seçimi */}
      <div className="grid gap-3 sm:grid-cols-2">
        <MethodCard
          active={method === "courier"}
          icon={Truck}
          title={t.checkout.methodCourier}
          hint={t.checkout.methodCourierHint}
          onClick={() => onMethodChange("courier")}
        />
        <MethodCard
          active={method === "pickup"}
          icon={Store}
          title={t.checkout.methodPickup}
          hint={t.checkout.methodPickupHint}
          onClick={() => onMethodChange("pickup")}
        />
      </div>

      {/* KURYER — ünvan seçimi */}
      {method === "courier" && (
        <section className="mt-6">
          <p className="mb-2 text-sm font-medium text-foreground">
            {t.checkout.chooseAddress}
          </p>

          {addresses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t.checkout.noAddressYet}
              </p>
              <Link
                href="/panel/addresses"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                {t.panel.addAddress}
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onAddressChange(a.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      addressId === a.id
                        ? "border-brand bg-brand/5"
                        : "border-border hover:border-brand/50"
                    }`}
                  >
                    <MapPin
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        addressId === a.id ? "text-brand" : "text-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-ink">
                        {a.label}
                        {a.isDefault && (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                            {t.panel.defaultLabel}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[a.cityName, a.districtName].filter(Boolean).join(", ")}
                        {a.cityName && " · "}
                        {a.line}
                      </p>
                      {/* Rayon seçilməyibsə tarif hesablana bilmir. */}
                      {!a.districtId && (
                        <p className="mt-0.5 text-xs font-medium text-destructive">
                          {t.panel.errMissingRegion}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {a.districtId
                        ? a.isFreeDelivery
                          ? t.checkout.freeShipping
                          : a.deliveryFee
                        : "—"}
                    </span>
                  </button>
                ))}
              </div>

              <Link
                href="/panel/addresses"
                className="mt-3 inline-block text-xs font-medium text-brand hover:underline"
              >
                {t.checkout.manageAddresses}
              </Link>
            </>
          )}
        </section>
      )}

      {/* PUDO — məntəqə seçimi */}
      {method === "pickup" && (
        <section className="mt-6">
          <p className="mb-2 text-sm font-medium text-foreground">
            {t.checkout.choosePickup}
          </p>

          <div className="space-y-2">
            {pickupPoints.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPickupChange(p.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  pickupPointId === p.id
                    ? "border-brand bg-brand/5"
                    : "border-border hover:border-brand/50"
                }`}
              >
                <Store
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    pickupPointId === p.id ? "text-brand" : "text-muted-foreground"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-ink">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.cityName}
                    {p.districtName && `, ${p.districtName}`} · {p.address}
                  </p>
                  {p.workHours && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {p.workHours}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold text-foreground">
                  {p.feeCents === 0 ? t.checkout.freeShipping : p.fee}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <button
        disabled={!ready}
        onClick={onNext}
        className="mt-6 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t.checkout.continueBtn}
      </button>
    </div>
  );
}

function MethodCard({
  active,
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: typeof Truck;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        active ? "border-brand bg-brand/5" : "border-border hover:border-brand/50"
      }`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
          active ? "bg-brand text-brand-foreground" : "bg-secondary text-muted-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-brand-ink">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      {active && <Check className="h-4 w-4 shrink-0 text-brand" />}
    </button>
  );
}

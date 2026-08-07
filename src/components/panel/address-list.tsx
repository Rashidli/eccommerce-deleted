"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2, Star, MapPin, Pencil, Truck, X } from "lucide-react";
import { useLang } from "@/context/lang-context";
import type { PanelAddress } from "@/lib/data/account";
import type { CityDTO } from "@/lib/data/geo";
import {
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type AddressState,
} from "@/app/(shop)/panel/addresses/actions";

/**
 * Ünvanlar — kuryer çatdırılması üçün.
 *
 * Şəhər/rayon MƏCBURİDİR, çünki kuryer tarifi rayondan hesablanır. Rayon
 * siyahısı seçilmiş şəhərə görə süzülür; hər ikisi bazadan gəlir (qayda #4).
 */
export function AddressList({
  addresses,
  cities,
}: {
  addresses: PanelAddress[];
  cities: CityDTO[];
}) {
  const { t } = useLang();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted-foreground">
            <MapPin className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-brand-ink">
            {t.panel.noAddresses}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.panel.noAddressesHint}
          </p>
        </div>
      )}

      {addresses.map((addr) =>
        editingId === addr.id ? (
          <AddressForm
            key={addr.id}
            cities={cities}
            address={addr}
            onDone={() => setEditingId(null)}
          />
        ) : (
          <article
            key={addr.id}
            className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-brand-ink">{addr.label}</p>
                  {addr.isDefault && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                      {t.panel.defaultLabel}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-foreground/80">
                  {addr.fullName} · {addr.phone}
                </p>
              </div>

              {/* Rayon tarifi — müştəri ünvanı seçəndə nə ödəyəcəyini görsün. */}
              {addr.districtName && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" />
                  {addr.isFreeDelivery ? t.checkout.freeShipping : addr.deliveryFee}
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {[addr.cityName, addr.districtName].filter(Boolean).join(", ")}
              {addr.cityName && " · "}
              {addr.line}
            </p>

            <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium">
              {!addr.isDefault && (
                <form action={setDefaultAddress}>
                  <input type="hidden" name="id" value={addr.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-foreground/70 transition-colors hover:text-brand"
                  >
                    <Star className="h-3.5 w-3.5" />
                    {t.panel.makeDefault}
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => setEditingId(addr.id)}
                className="flex items-center gap-1 text-foreground/70 transition-colors hover:text-brand"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t.panel.edit}
              </button>
              <form action={deleteAddress}>
                <input type="hidden" name="id" value={addr.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1 text-foreground/70 transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.panel.remove}
                </button>
              </form>
            </div>
          </article>
        ),
      )}

      {adding ? (
        <AddressForm cities={cities} onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3.5 text-sm font-semibold text-foreground/70 transition-colors hover:border-brand hover:text-brand"
        >
          <Plus className="h-4 w-4" />
          {t.panel.addAddress}
        </button>
      )}
    </div>
  );
}

/** Əlavə/redaktə formu — `address` verilibsə redaktə rejimidir. */
function AddressForm({
  cities,
  address,
  onDone,
}: {
  cities: CityDTO[];
  address?: PanelAddress;
  onDone: () => void;
}) {
  const { t } = useLang();
  const editing = Boolean(address);

  const [state, formAction] = useActionState<AddressState, FormData>(
    editing ? updateAddress : addAddress,
    {},
  );

  /**
   * Xətadan sonra istifadəçinin yazdıqları geri gəlir (`state.values`), yoxsa
   * redaktə edilən ünvanın dəyəri, yoxsa boş.
   *
   * Bu olmadan "Şəhər və rayon seçin" xətasında BÜTÜN forma silinirdi —
   * `defaultValue` yalnız ilk render-də tətbiq olunur, server action isə
   * komponenti yenidən render etdirir.
   */
  const v = state.values;
  const initial = {
    label: v?.label ?? address?.label ?? "",
    fullName: v?.fullName ?? address?.fullName ?? "",
    phone: v?.phone ?? address?.phone ?? "",
    line: v?.line ?? address?.line ?? "",
  };

  // Rayon siyahısı seçilmiş şəhərə bağlıdır — şəhər dəyişəndə sıfırlanır.
  const [cityId, setCityId] = useState(
    v?.cityId || address?.cityId || cities[0]?.id || "",
  );
  const [districtId, setDistrictId] = useState(
    v?.districtId || address?.districtId || "",
  );

  const districts = cities.find((c) => c.id === cityId)?.districts ?? [];

  // Uğurlu göndərişdən sonra formu bağlayırıq.
  if (state.ok) {
    onDone();
  }

  const errorText: Record<string, string> = {
    missingFields: t.panel.errMissingFields,
    missingRegion: t.panel.errMissingRegion,
    notFound: t.panel.errNotFound,
  };

  return (
    <form
      // `defaultValue` YALNIZ ilk render-də tətbiq olunur. Xəta dəyişəndə
      // forma yenidən qurulmalıdır ki, serverin qaytardığı dəyərlər düşsün.
      key={`${state.error ?? ""}:${v?.fullName ?? ""}`}
      action={formAction}
      className="space-y-3 rounded-2xl border border-brand/40 bg-card p-4"
    >
      {editing && <input type="hidden" name="id" value={address!.id} />}

      {state.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {errorText[state.error] ?? t.checkout.errGeneric}
        </p>
      )}

      <Field
        name="label"
        placeholder={t.panel.addressLabel}
        defaultValue={initial.label}
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name="fullName"
          placeholder={t.panel.fullName}
          defaultValue={initial.fullName}
          required
        />
        <Field
          name="phone"
          type="tel"
          placeholder={t.panel.phone}
          defaultValue={initial.phone}
          required
        />
      </div>

      {/* Şəhər + rayon — tarif buradan hesablanır */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          name="cityId"
          value={cityId}
          onChange={(e) => {
            setCityId(e.target.value);
            setDistrictId("");
          }}
          label={t.panel.city}
        >
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          name="districtId"
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
          label={t.panel.district}
        >
          <option value="">{t.panel.chooseDistrict}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {d.isFree ? t.checkout.freeShipping : d.fee}
            </option>
          ))}
        </Select>
      </div>

      <Field
        name="line"
        placeholder={t.panel.addressLine}
        defaultValue={initial.line}
        required
      />

      <div className="flex gap-2 pt-1">
        <SaveButton />
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-secondary"
        >
          <X className="h-4 w-4" />
          {t.checkout.back}
        </button>
      </div>
    </form>
  );
}

function SaveButton() {
  const { t } = useLang();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {t.panel.save}
    </button>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
    />
  );
}

function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <select
        {...props}
        className="w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand"
      >
        {children}
      </select>
    </label>
  );
}

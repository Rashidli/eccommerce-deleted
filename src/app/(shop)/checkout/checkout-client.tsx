"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Check, ArrowLeft, CreditCard, Lock, Truck, Store } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useCart } from "@/context/cart-context";
import { useLang } from "@/context/lang-context";
import { ShippingSummary } from "@/components/shipping-summary";
import { DeliveryStep } from "@/components/checkout/delivery-step";
import type { PanelAddress } from "@/lib/data/account";
import type { PickupPointDTO } from "@/lib/data/geo";
import type { DeliveryMethod } from "@/lib/shipping/local";
import type { CartItem } from "@/context/cart-context";
import { placeOrder, type PlaceOrderState } from "@/lib/orders/place-order";

type Step = "delivery" | "payment";

export function CheckoutClient({
  addresses,
  pickupPoints,
}: {
  addresses: PanelAddress[];
  pickupPoints: PickupPointDTO[];
}) {
  const { t } = useLang();
  const { items } = useCart();

  const [step, setStep] = useState<Step>("delivery");
  const [method, setMethod] = useState<DeliveryMethod>("courier");
  // Əsas ünvan avtomatik seçilir — müştəri hər dəfə axtarmasın.
  const [addressId, setAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null,
  );
  const [pickupPointId, setPickupPointId] = useState<string | null>(null);

  const address = addresses.find((a) => a.id === addressId) ?? null;
  const pickup = pickupPoints.find((p) => p.id === pickupPointId) ?? null;

  const steps = useMemo(
    () => [
      { key: "delivery", label: t.checkout.stepDelivery },
      { key: "payment", label: t.checkout.stepPayment },
    ],
    [t],
  );
  const currentIndex = steps.findIndex((s) => s.key === step);

  if (items.length === 0) {
    return (
      <PageShell title={t.checkout.title}>
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">{t.checkout.emptyCart}</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
          >
            {t.pages.continueShopping}
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={t.checkout.title}>
      {/* Addım göstəricisi */}
      <ol className="mb-8 flex items-center gap-2 sm:gap-4">
        {steps.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  done || active
                    ? "bg-brand text-brand-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={`hidden text-sm font-medium sm:block ${
                  active ? "text-brand-ink" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <span className="h-px flex-1 bg-border" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          {step === "delivery" && (
            <DeliveryStep
              method={method}
              onMethodChange={setMethod}
              addresses={addresses}
              addressId={addressId}
              onAddressChange={setAddressId}
              pickupPoints={pickupPoints}
              pickupPointId={pickupPointId}
              onPickupChange={setPickupPointId}
              onNext={() => setStep("payment")}
            />
          )}

          {step === "payment" && (
            <PaymentStep
              method={method}
              address={address}
              pickup={pickup}
              onBack={() => setStep("delivery")}
            />
          )}
        </div>

        <Summary items={items} />
      </div>
    </PageShell>
  );
}

/** "Ödə" düyməsi — server action gedərkən təkrar göndərmə bloklanır. */
function PayButton() {
  const { t } = useLang();
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Lock className="h-4 w-4" />
      {pending ? t.checkout.placing : t.checkout.payNow}
    </button>
  );
}

/**
 * Ödəniş addımı.
 *
 * KART SAHƏLƏRİ YOXDUR — kart məlumatı provayderin öz səhifəsində daxil edilir.
 * Burada yalnız sifariş yaradılır və istifadəçi provayderə yönləndirilir.
 *
 * Səbət brauzerdə saxlanıldığı üçün serverə göndərilir, LAKİN qiymətsiz:
 * qiymətləri `placeOrder` bazadan oxuyur (client qiymətinə etibar edilmir).
 */
function PaymentStep({
  method,
  address,
  pickup,
  onBack,
}: {
  method: DeliveryMethod;
  address: PanelAddress | null;
  pickup: PickupPointDTO | null;
  onBack: () => void;
}) {
  const { t } = useLang();
  const { items } = useCart();
  const [state, formAction] = useActionState<PlaceOrderState, FormData>(
    placeOrder,
    {},
  );

  const errorText: Record<string, string> = {
    unavailable: t.checkout.errUnavailable,
    missingDelivery: t.checkout.errMissingDelivery,
    emptyCart: t.checkout.errEmptyCart,
    noAddress: t.checkout.errNoAddress,
    noPickup: t.checkout.errNoPickup,
    missingRegion: t.panel.errMissingRegion,
  };

  const payload = JSON.stringify(
    items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      size: i.size,
      color: i.color,
      variantId: i.variantId,
      sku: i.sku,
    })),
  );

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-brand-ink">
        {t.checkout.stepPayment}
      </h2>

      {/* Seçilmiş çatdırılma — müştəri ödəməzdən əvvəl təsdiqləsin */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
          {method === "courier" ? (
            <Truck className="h-4 w-4" />
          ) : (
            <Store className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {method === "courier"
              ? t.checkout.methodCourier
              : t.checkout.methodPickup}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-brand-ink">
            {method === "courier" ? address?.label : pickup?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {method === "courier"
              ? [address?.cityName, address?.districtName, address?.line]
                  .filter(Boolean)
                  .join(", ")
              : [pickup?.cityName, pickup?.address].filter(Boolean).join(", ")}
          </p>
        </div>
      </div>

      {state.error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {errorText[state.error] ?? t.checkout.errGeneric}
        </p>
      )}

      <form action={formAction} className="space-y-4">
        {/* Yalnız SEÇİM göndərilir — məbləği server bazadan hesablayır. */}
        <input type="hidden" name="deliveryMethod" value={method} />
        <input type="hidden" name="addressId" value={address?.id ?? ""} />
        <input type="hidden" name="pickupPointId" value={pickup?.id ?? ""} />
        <input type="hidden" name="items" value={payload} />

        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
          <CreditCard className="h-4 w-4 shrink-0" />
          <span>{t.checkout.securePayNote}</span>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.checkout.back}
          </button>
          <PayButton />
        </div>
      </form>
    </div>
  );
}

function Summary({ items }: { items: CartItem[] }) {
  const { t } = useLang();

  return (
    <aside className="h-fit rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 font-bold text-brand-ink">
        {t.checkout.orderSummary}
      </h3>

      {/* Platforma üzrə çatdırılma + valyuta üzrə yekun.
          Əvvəl burada sabit `DELIVERY_FEE` və bütün valyutaların "$" altında
          cəmi göstərilirdi; hər ikisi yanlış idi — çatdırılma platformadan
          gəlir və CNY ilə EUR toplanmır. Yekun serverdə də eyni məntiqlə
          (`quoteCart`) yenidən hesablanır. */}
      <ShippingSummary items={items} />
    </aside>
  );
}

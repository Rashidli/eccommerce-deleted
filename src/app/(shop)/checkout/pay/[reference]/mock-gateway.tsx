"use client";

import Link from "next/link";
import { ShieldCheck, Lock } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useLang } from "@/context/lang-context";
import { formatMoney } from "@/lib/format";

/**
 * Provayderin hosted səhifəsinin təqlidi.
 *
 * QƏSDƏN kart sahələri YOXDUR — forma yalnız imzalanmış nəticəni callback-ə
 * göndərir. Real provayderdə kart məlumatı onun öz domenində qalır və bizə
 * yalnız imzalanmış nəticə gəlir; burada da eyni sərhəd saxlanılır.
 */
export function MockGateway({
  reference,
  amountCents,
  orderReference,
  signature,
}: {
  reference: string;
  amountCents: number;
  orderReference: string;
  signature: string;
}) {
  const { t } = useLang();

  return (
    <PageShell title={t.checkout.gatewayTitle}>
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>{t.checkout.gatewayNote}</span>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t.checkout.orderRef}</dt>
            <dd className="font-mono font-medium text-brand-ink">
              {orderReference}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base">
            <dt className="font-bold text-brand-ink">
              {t.checkout.amountToPay}
            </dt>
            <dd className="font-bold text-brand-ink">
              {formatMoney(amountCents)}
            </dd>
          </div>
        </dl>

        {/* Nəticə birbaşa callback-ə gedir; imza serverdə hesablanıb. */}
        <form action="/api/payment/callback" method="POST" className="mt-6">
          <input type="hidden" name="reference" value={reference} />
          <input type="hidden" name="amountCents" value={amountCents} />
          <input type="hidden" name="sig" value={signature} />

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
          >
            <ShieldCheck className="h-4 w-4" />
            {t.checkout.confirmPay}
          </button>
        </form>

        <Link
          href="/checkout"
          className="mt-3 block text-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t.checkout.cancelPay}
        </Link>
      </div>
    </PageShell>
  );
}

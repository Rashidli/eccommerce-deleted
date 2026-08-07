"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, ExternalLink } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { updateOrderItem } from "../actions";

type Item = {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  sku: string | null;
  /** Müştərinin seçdiyi variant — Zara-da bunsuz alış mümkün deyil. */
  size: string | null;
  color: string | null;
  /** Sətirdə saxlanmayıbsa SKU-dan bərpa olunmuş variant. */
  resolved: { size: string | null; color: string | null } | null;
  source: string | null;
  sourceUrl: string | null;
  purchasedAt: Date | null;
  trackingCode: string | null;
  deliveryCode: string | null;
  image: string | null;
};

const INPUT =
  "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Saxlanılır…" : "Saxla"}
    </button>
  );
}

export function OrderItemRow({ item, orderId }: { item: Item; orderId: string }) {
  const [purchased, setPurchased] = useState(Boolean(item.purchasedAt));

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start gap-3">
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg bg-secondary object-contain p-1"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="font-medium text-brand-ink">{item.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatMoney(item.priceCents)} × {item.quantity} ={" "}
            <span className="font-semibold text-brand-ink">
              {formatMoney(item.priceCents * item.quantity)}
            </span>
          </p>
          {/* SEÇİLMİŞ VARİANT — operatorun ən çox ehtiyac duyduğu məlumat.
              Boşdursa AÇIQ deyilir: ölçüsüz sifarişi Zara-dan almaq mümkün
              deyil, yəni bu, əlaqə saxlanmalı haldır. */}
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {item.size && (
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 font-medium text-brand-ink">
                Ölçü: {item.size}
              </span>
            )}
            {item.color && (
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 font-medium text-brand-ink">
                Rəng: {item.color}
              </span>
            )}
            {/* Sətirdə yoxdursa SKU-dan bərpa edilmişini göstəririk —
                məlumat itməyib, sadəcə başqa yerdə saxlanılıb. */}
            {!item.size && !item.color && item.resolved && (
              <>
                {item.resolved.size && (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-muted-foreground">
                    Ölçü: {item.resolved.size}
                    <span className="ml-1 opacity-60">(SKU-dan)</span>
                  </span>
                )}
                {item.resolved.color && (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-muted-foreground">
                    Rəng: {item.resolved.color}
                    <span className="ml-1 opacity-60">(SKU-dan)</span>
                  </span>
                )}
              </>
            )}
            {!item.size && !item.color && !item.resolved && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-800">
                Variant seçilməyib
              </span>
            )}
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {item.source && (
              <span className="inline-block rounded-full bg-secondary px-2 py-0.5 font-medium uppercase tracking-wide text-muted-foreground">
                {item.source}
              </span>
            )}
            <span className="text-muted-foreground">
              SKU:{" "}
              <span className="font-mono text-foreground">
                {item.sku ?? "—"}
              </span>
            </span>
            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
              >
                {item.source ? `${item.source}-də aç` : "Mənbədə aç"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              // Link yoxdursa operator bunu dərhal görməlidir — sükutla keçmir.
              <span className="text-muted-foreground">Mənbə linki yoxdur</span>
            )}
          </p>
        </div>

        {purchased && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
            <Check className="h-3.5 w-3.5" />
            Alınıb
          </span>
        )}
      </div>

      <form action={updateOrderItem} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="orderId" value={orderId} />

        {/* VARİANT — adətən checkout-da yazılır, amma köhnə sifarişlərdə boş
            qalır. Ölçüsüz sətri Zara-dan almaq mümkün deyil, ona görə operator
            müştəri ilə dəqiqləşdirib buradan doldura bilir. Boşdursa SKU-dan
            bərpa olunan dəyər yer tutucuda təklif kimi göstərilir. */}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Ölçü
          </span>
          <input
            name="size"
            defaultValue={item.size ?? ""}
            placeholder={item.resolved?.size ?? "seçilməyib"}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Rəng
          </span>
          <input
            name="color"
            defaultValue={item.color ?? ""}
            placeholder={item.resolved?.color ?? "seçilməyib"}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            İzləmə kodu
          </span>
          <input
            name="trackingCode"
            defaultValue={item.trackingCode ?? ""}
            placeholder="Tədarükçünün kargo kodu"
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Çatdırılma kodu
          </span>
          <input
            name="deliveryCode"
            defaultValue={item.deliveryCode ?? ""}
            placeholder="Yerli kargo kodu"
            className={INPUT}
          />
        </label>

        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              name="purchased"
              checked={purchased}
              onChange={(event) => setPurchased(event.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            <span className="text-sm font-medium">Alındı</span>
          </label>
          <SaveButton />
        </div>
      </form>
    </li>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, ShoppingBag, Truck, RotateCcw, Shield } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useLang } from "@/context/lang-context";
import { formatMoney } from "@/lib/format";

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, totalItems, totals, isMixedCurrency } =
    useCart();
  const { t } = useLang();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-brand-ink flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t.pages.cart} ({totalItems})
          </h2>
          <button
            onClick={closeCart}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-semibold text-foreground">{t.pages.emptyCart}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.pages.empty}</p>
              <button
                onClick={closeCart}
                className="mt-6 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 transition-opacity"
              >
                {t.pages.continueShopping}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={`${item.id}-${item.size}-${item.color}-${index}`}
                  className="flex gap-3 p-2 rounded-lg bg-card border border-border"
                >
                  {/* Şəkil — `src` boş ola bilər (variantın öz şəkli yoxdursa
                      və ya platforma verməyibsə). Boş `src` ilə <Image> heç nə
                      render etmir və sətir şəkilsiz görünürdü; ona görə
                      yoxlanılır və yerinə boz yer tutucu qoyulur. */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.img ? (
                      <Image
                        src={item.img}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-contain"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-muted-foreground/40">
                        <ShoppingBag className="h-5 w-5" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Name */}
                    <p className="text-sm font-semibold text-brand-ink truncate">{item.name}</p>

                    {/* Brand */}
                    <p className="text-[11px] text-muted-foreground">{item.brand}</p>

                    {/* Size & Color */}
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.size && (
                        <span className="text-[11px] text-muted-foreground">
                          {item.size}
                        </span>
                      )}
                      {item.size && item.color && <span className="text-[11px] text-muted-foreground">•</span>}
                      {item.color && (
                        <span className="text-[11px] text-muted-foreground">
                          {item.color}
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <p className="text-sm font-bold bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent mt-1">
                      {formatMoney(item.priceCents, item.currency)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end justify-between">
                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id, item.size, item.color)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>

                    {/* Quantity */}
                    <div className="flex items-center gap-0.5 rounded-md border border-border">
                      {/* 1 ədəddə "−" SÖNÜKDÜR: əvvəl bir klik məhsulu
                          səbətdən silirdi. Silmək (×) düyməsinin işidir. */}
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.size, item.color)}
                        disabled={item.quantity <= 1}
                        aria-label="−"
                        className="grid h-6 w-6 place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-muted-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.size, item.color)}
                        className="grid h-6 w-6 place-items-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-4 space-y-4">
            {/* Subtotal */}
            {/* Valyuta üzrə yekun. Əvvəl burada bütün valyutalar "$" ilə
                cəmlənirdi — ¥ məhsul $ kimi görünürdü və CNY+EUR toplanırdı. */}
            <div className="space-y-1">
              {totals.map((tot) => (
                <div key={tot.currency} className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {isMixedCurrency ? tot.currency : t.pages.subtotal}
                  </span>
                  <span className="text-xl font-bold text-brand-ink">
                    {formatMoney(tot.cents, tot.currency)}
                  </span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Link
                href="/cart"
                onClick={closeCart}
                className="flex-1 rounded-lg border border-border py-2.5 text-center text-sm font-semibold text-foreground hover:border-brand hover:text-brand transition-colors"
              >
                {t.pages.viewCart}
              </Link>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="flex-1 rounded-lg bg-brand-ink py-2.5 text-center text-sm font-semibold text-white hover:bg-brand transition-colors"
              >
                {t.pages.checkout}
              </Link>
            </div>

            {/* Perks */}
            <div className="flex justify-between pt-3 mt-3 border-t border-border">
              <div className="flex flex-col items-center gap-1">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10">
                  <Truck className="h-4 w-4 text-brand" />
                </div>
                <span className="text-[10px] font-medium text-foreground">{t.perks.shipping.title}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10">
                  <RotateCcw className="h-4 w-4 text-brand" />
                </div>
                <span className="text-[10px] font-medium text-foreground">{t.perks.support.title}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10">
                  <Shield className="h-4 w-4 text-brand" />
                </div>
                <span className="text-[10px] font-medium text-foreground">{t.perks.prices.title}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

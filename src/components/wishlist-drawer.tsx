"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Heart, ShoppingCart, LayoutGrid, List, Star } from "lucide-react";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/cart-context";
import { useLang } from "@/context/lang-context";
import { formatMoney } from "@/lib/format";

export function WishlistDrawer() {
  const { items, isOpen, closeWishlist, removeItem, totalItems } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { t } = useLang();
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  if (!isOpen) return null;

  const handleAddToCart = (item: typeof items[0]) => {
    addToCart({
      id: item.id,
      name: item.name,
      priceCents: item.priceCents,
      currency: item.currency,
      brand: item.brand,
      img: item.img,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={closeWishlist}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-brand-ink flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive fill-destructive" />
            {t.pages.wishlist} ({totalItems})
          </h2>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-border p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${
                  viewMode === "list" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${
                  viewMode === "grid" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={closeWishlist}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Wishlist Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Heart className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-semibold text-foreground">{t.pages.empty}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.pages.wishlist}</p>
              <button
                onClick={closeWishlist}
                className="mt-6 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 transition-opacity"
              >
                {t.pages.continueShopping}
              </button>
            </div>
          ) : viewMode === "list" ? (
            /* List View */
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-2 rounded-lg bg-white border border-gray-100"
                >
                  {/* Image */}
                  <Link
                    href={`/products/${item.id}`}
                    onClick={closeWishlist}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-50"
                  >
                    <Image
                      src={item.img}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-contain p-1"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.id}`}
                      onClick={closeWishlist}
                      className="text-sm font-semibold text-brand-ink truncate block hover:text-brand"
                    >
                      {item.name}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{item.brand}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-[11px] text-muted-foreground">{item.rating}</span>
                    </div>
                    <p className="text-sm font-bold bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent mt-1">
                      {formatMoney(item.priceCents, item.currency)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-brand-ink text-white hover:bg-brand transition-colors"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-100 overflow-hidden bg-white"
                >
                  {/* Image */}
                  <Link
                    href={`/products/${item.id}`}
                    onClick={closeWishlist}
                    className="relative aspect-square block bg-gray-50"
                  >
                    <Image
                      src={item.img}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      className="object-contain p-2"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        removeItem(item.id);
                      }}
                      className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white/80 text-gray-400 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Link>

                  {/* Info */}
                  <div className="p-2">
                    <p className="text-xs font-semibold text-brand-ink truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.brand}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-sm font-bold bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                        {formatMoney(item.priceCents, item.currency)}
                      </p>
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="grid h-7 w-7 place-items-center rounded-md bg-brand-ink text-white hover:bg-brand transition-colors"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — tam səhifə linki */}
        {items.length > 0 && (
          <div className="border-t border-border p-4">
            <Link
              href="/wishlist"
              onClick={closeWishlist}
              className="block w-full rounded-lg bg-brand-ink py-2.5 text-center text-sm font-semibold text-white hover:bg-brand transition-colors"
            >
              {t.pages.viewWishlist}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

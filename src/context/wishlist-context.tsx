"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface WishlistItem {
  id: string;
  name: string;
  /** Səbətlə eyni səbəb: formatlanmış mətn valyutanı itirirdi. */
  priceCents: number;
  /** Məhsulun öz valyutası (CNY / EUR / ...). */
  currency: string;
  brand: string;
  img: string;
  rating: number;
}

interface WishlistContextType {
  items: WishlistItem[];
  isOpen: boolean;
  openWishlist: () => void;
  closeWishlist: () => void;
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  toggleItem: (item: WishlistItem) => void;
  totalItems: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

/**
 * Seçilmişlər səhifə yenilənəndə itməsin — səbətlə eyni məntiq.
 * Açarda versiya var: element forması dəyişdiyi üçün köhnə açar oxunmur.
 */
const STORAGE_KEY = "ecommerce:wishlist:v2";
const LEGACY_STORAGE_KEYS = ["ecommerce:wishlist"];

/**
 * Saxlanmış data pozuq və ya KÖHNƏ formatda ola bilər.
 * Köhnə sətirlərdə valyuta yoxdur — səbətdəki kimi, təxmin etmək əvəzinə
 * atılır (istifadəçi məhsulu yenidən seçilmişlərə əlavə edir).
 */
function parseStoredWishlist(raw: string | null): WishlistItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((i): i is WishlistItem => {
      if (!i || typeof i !== "object") return false;
      const w = i as Partial<WishlistItem>;
      return (
        typeof w.id === "string" &&
        typeof w.name === "string" &&
        typeof w.priceCents === "number" &&
        Number.isFinite(w.priceCents) &&
        typeof w.currency === "string" &&
        w.currency.length > 0
      );
    });
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

  // Oxumaq render zamanı yox, `useEffect`-də (hydration uyğunsuzluğu olmasın).
  // Bayraq `useState`-dir: ref olsaydı, mount-da yazma effekti hələ BOŞ `items`
  // ilə işləyib saxlanmış siyahını əzərdi (cart-context ilə eyni səbəb).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = parseStoredWishlist(localStorage.getItem(STORAGE_KEY));
      if (stored.length > 0) setItems(stored);
      for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
    } catch {
      // Şəxsi rejimdə localStorage bloklana bilər — siyahı sadəcə yadda qalmır.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);
  const [isOpen, setIsOpen] = useState(false);

  const openWishlist = () => setIsOpen(true);
  const closeWishlist = () => setIsOpen(false);

  const addItem = (newItem: WishlistItem) => {
    setItems((prev) => {
      if (prev.some((item) => item.id === newItem.id)) {
        return prev;
      }
      return [...prev, newItem];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const isInWishlist = (id: string) => {
    return items.some((item) => item.id === id);
  };

  const toggleItem = (item: WishlistItem) => {
    if (isInWishlist(item.id)) {
      removeItem(item.id);
    } else {
      addItem(item);
    }
  };

  const totalItems = items.length;

  return (
    <WishlistContext.Provider
      value={{
        items,
        isOpen,
        openWishlist,
        closeWishlist,
        addItem,
        removeItem,
        isInWishlist,
        toggleItem,
        totalItems,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}

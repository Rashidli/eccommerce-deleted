"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";

export interface CartItem {
  id: string;
  name: string;
  /**
   * Qiymət SENTLƏ və valyuta AYRICA saxlanılır.
   *
   * Əvvəl burada formatlanmış mətn ("$54.90") vardı və yekun onu regex ilə
   * geri parse edirdi — valyuta itirdi, ona görə ¥ məhsul $ ilə görünürdü.
   * Rəqəm + valyuta cütü ilə həm göstəriş, həm hesablama düzgün olur.
   */
  priceCents: number;
  /** Məhsulun öz valyutası (1688/taobao → CNY, zara → EUR). */
  currency: string;
  brand: string;
  img: string;
  size?: string;
  color?: string;
  /** Platformadakı SKU/spec identifikatoru — sifariş verilərkən dəqiq variant üçün. */
  variantId?: string;
  /** Tədarükçü artikulu (1688 `cargoNumber`) — operator alış edərkən lazımdır. */
  sku?: string;
  quantity: number;
}

/** Valyuta üzrə yekun — fərqli valyutalar BİR rəqəmə toplanmır. */
export type CartCurrencyTotal = {
  currency: string;
  cents: number;
};

/**
 * Səbət brauzerdə saxlanılır. Əks halda hər tam yüklənmədə (səhifə yenilənməsi
 * və ya login-dən sonrakı server yönləndirməsi) React ağacı sıfırdan qurulur və
 * səbət boşalırdı — istifadəçi üçün "səbətə atma işləmir" kimi görünürdü.
 */
/**
 * Açarda VERSİYA var: element forması və ya QİYMƏTİN MƏNASI dəyişəndə köhnə
 * açar oxunmur və zibil qalmır.
 *
 *  v1 → v2: formatlanmış qiymət mətni ("$54.90") → `priceCents` + `currency`.
 *  v2 → v3: mağaza VAHİD göstəriş valyutasına (USD) keçdi. v2 sətirləri
 *           platformanın öz valyutasındadır (CNY/EUR); onları yeni sətirlərlə
 *           yan-yana saxlasaq səbətdə iki valyuta qarışardı. Sətirlər ATILIR —
 *           istifadəçi məhsulu yenidən əlavə edir və düzgün valyuta ilə düşür.
 *           (Çevirib saxlamaq da olardı, amma o zaman səbətdəki qiymət cari
 *           məzənnə ilə səssizcə dəyişərdi.)
 */
const STORAGE_KEY = "ecommerce:cart:v3";
const LEGACY_STORAGE_KEYS = ["ecommerce:cart", "ecommerce:cart:v2"];

/**
 * Yaddaşdakı data zədəli və ya KÖHNƏ FORMATDA ola bilər.
 *
 * Köhnə format qiyməti formatlanmış mətn kimi saxlayırdı (`price: "$54.90"`)
 * və valyutası yox idi. Belə sətri "yəqin CNY-dir" deyə keçirmək müştəriyə
 * YANLIŞ qiymət göstərmək olardı — məsələn $54.90-lıq element ¥54.90 kimi
 * görünərdi. Ona görə köhnə sətirlər QƏBUL EDİLMİR, ATILIR: istifadəçi
 * məhsulu yenidən əlavə edir və düzgün valyuta ilə düşür.
 *
 * (Alternativ — məhsulu bazadan yenidən oxumaq — server sorğusu tələb edir və
 * hydration-ı gecikdirir; səbətdə adətən 1-3 element olur, təkrar əlavə etmək
 * yanlış qiymət göstərməkdən qat-qat ucuzdur.)
 */
function parseStored(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((it): it is CartItem => {
      if (!it || typeof it !== "object") return false;
      const c = it as Partial<CartItem>;
      return (
        typeof c.id === "string" &&
        typeof c.name === "string" &&
        // YENİ format şərti — köhnə sətirlərdə bunlar yoxdur, ona görə düşür.
        typeof c.priceCents === "number" &&
        Number.isFinite(c.priceCents) &&
        typeof c.currency === "string" &&
        c.currency.length > 0 &&
        typeof c.quantity === "number" &&
        c.quantity > 0
      );
    });
  } catch {
    return [];
  }
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** `quantity` verilməsə 1 əlavə olunur. */
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string, size?: string, color?: string) => void;
  updateQuantity: (id: string, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  totalItems: number;
  /**
   * Valyuta üzrə yekunlar. Tək rəqəm QƏSDƏN yoxdur — səbətdə CNY və EUR
   * eyni anda ola bilər, onları cəmləmək maliyyə səhvidir (çatdırılma qatı
   * `OrderTotal` ilə eyni model).
   */
  totals: CartCurrencyTotal[];
  /** Birdən çox valyuta var — UI hər birini ayrıca sətirdə göstərməlidir. */
  isMixedCurrency: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** Eyni məhsul ancaq eyni ölçü VƏ rəngdə birləşir (variantlar ayrı sətirdir). */
function sameLine(a: CartItem, b: Pick<CartItem, "id" | "size" | "color">) {
  return a.id === b.id && a.size === b.size && a.color === b.color;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Yaddaşdan oxumaq RENDER zamanı yox, `useEffect`-də olur — server ilə ilk
  // render eyni qalsın deyə (hydration uyğunsuzluğu olmasın).
  //
  // Bayraq `useRef` yox, `useState`-dir: mount zamanı hər iki effekt eyni
  // commit-də işləyir və ref variantında yazma effekti hələ BOŞ olan `items`
  // ilə çağırılıb saxlanmış səbəti bir anlıq əzirdi. State ilə isə yazma
  // effekti yalnız oxunuşdan SONRAKI render-də işə düşür.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = parseStored(localStorage.getItem(STORAGE_KEY));
      if (stored.length > 0) setItems(stored);
      // Köhnə formatlı səbət bir dəfə təmizlənir (valyutası olmadığı üçün
      // etibarlı şəkildə çevrilə bilmir).
      for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
    } catch {
      // Şəxsi rejimdə localStorage bloklana bilər — səbət sadəcə yadda qalmır.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    (newItem: Omit<CartItem, "quantity">, quantity = 1) => {
      const qty = Math.max(1, Math.floor(quantity));
      setItems((prev) => {
        const i = prev.findIndex((item) => sameLine(item, newItem));
        if (i > -1) {
          // Obyekti YERİNDƏ dəyişmirik — React dəyişikliyi etibarlı görsün deyə
          // həm massiv, həm də sətir yenidən yaradılır.
          const updated = [...prev];
          updated[i] = { ...updated[i], quantity: updated[i].quantity + qty };
          return updated;
        }
        return [...prev, { ...newItem, quantity: qty }];
      });
      setIsOpen(true);
    },
    [],
  );

  const removeItem = useCallback((id: string, size?: string, color?: string) => {
    setItems((prev) => prev.filter((item) => !sameLine(item, { id, size, color })));
  }, []);

  /**
   * Say dəyişikliyi. 1-dən AŞAĞI DÜŞMÜR.
   *
   * Əvvəl `quantity < 1` sətri səbətdən silirdi: müştəri "−" düyməsini bir
   * dəfə artıq basanda məhsul xəbərdarlıq olmadan yox olurdu. Silmək ayrıca
   * (×) düyməsinin işidir — təsadüfi klik məhsulu itirməməlidir.
   */
  const updateQuantity = useCallback(
    (id: string, quantity: number, size?: string, color?: string) => {
      const next = Math.max(1, Math.floor(quantity));
      setItems((prev) =>
        prev.map((item) =>
          sameLine(item, { id, size, color })
            ? { ...item, quantity: next }
            : item,
        ),
      );
    },
    [],
  );

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Valyuta üzrə qruplaşdırma — cross-currency cəm YOXDUR.
  const totals = useMemo<CartCurrencyTotal[]>(() => {
    const byCurrency = new Map<string, number>();
    for (const item of items) {
      const prev = byCurrency.get(item.currency) ?? 0;
      byCurrency.set(item.currency, prev + item.priceCents * item.quantity);
    }
    return [...byCurrency.entries()].map(([currency, cents]) => ({
      currency,
      cents,
    }));
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart,
        closeCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totals,
        isMixedCurrency: totals.length > 1,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

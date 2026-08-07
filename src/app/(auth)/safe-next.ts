/**
 * Login/qeydiyyatdan sonra qayıdış ünvanının təhlükəsizlik süzgəci.
 *
 * Ayrıca fayldadır, çünki `actions.ts` `"use server"`-dir və oradan yalnız
 * async server action ixrac oluna bilər — bu isə həm server action-larda,
 * həm də səhifə komponentlərində işlədilir.
 */

/** Login-dən sonra yönləndirilə bilən yollar (səbət/ödəniş axını da daxil). */
const ALLOWED_NEXT_PREFIXES = ["/panel", "/checkout", "/cart", "/wishlist"];

/** Heç bir etibarlı hədəf olmayanda gedilən yer. */
export const DEFAULT_NEXT = "/panel";

/**
 * Açıq yönləndirməyə (open redirect) qarşı qorunma.
 * YALNIZ eyni originə aid, sırf yol olan ünvanlara icazə verilir:
 *  - mütləq `/` ilə başlamalı;
 *  - `//` və ya `/\` ilə başlamamalı (bunlar xarici sayta aparır);
 *  - tərkibində `\`, yeni sətir/tab olmamalı;
 *  - yol hissəsində `:` (sxem) olmamalı;
 *  - ağ siyahıdakı prefikslərdən biri ilə başlamalı.
 *
 * Şübhəli hər hal təhlükəsiz defolta düşür.
 */
export function safeNext(v: string | null | undefined): string {
  const next = String(v ?? "").trim();

  if (!next.startsWith("/")) return DEFAULT_NEXT;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_NEXT;
  if (/[\\\r\n\t]/.test(next)) return DEFAULT_NEXT;

  // Yol hissəsini sorğu/fraqmentdən ayırıb prefiksi yoxlayırıq.
  const path = next.split(/[?#]/)[0];
  if (path.includes(":")) return DEFAULT_NEXT;

  const ok = ALLOWED_NEXT_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
  return ok ? next : DEFAULT_NEXT;
}

/**
 * Səhifələr üçün: verilmiş `next` etibarlıdırsa qaytarır, əks halda `undefined`.
 * (Forma gizli sahəsinə yalnız real hədəf yazılsın deyə.)
 */
export function validNextOrUndefined(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  const safe = safeNext(v);
  return safe === DEFAULT_NEXT && v !== DEFAULT_NEXT ? undefined : safe;
}

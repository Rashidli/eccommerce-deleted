import "server-only";
import { partzonaFetch } from "./client";

// Yüksək səviyyəli Partzona endpoint funksiyaları — parametr adları OpenAPI spesifikasiyasından
// (təsdiqlənib). Cavab formaları sənədləşdirilməyib → `unknown` qaytarılır, normalize.ts emal edir.

/* ------------------------------- 1688 (/products) ------------------------------ */

export type Search1688Params = {
  keyword: string; // çincə tövsiyə olunur (AI tərcümədən sonra)
  page?: number;
  per_page?: number; // max 50
  country?: "en" | "ru" | "zh" | "ja" | "ko";
  price_start?: string;
  price_end?: string;
  category_id?: number;
  sort?: string;
  filter?: string; // CSV: tradeAssurance,verifiedManufacturer,oneStopSupplier,...
  keyword_translate?: boolean;
  lang?: "az" | "ru" | "en";
};

export function search1688(p: Search1688Params) {
  return partzonaFetch("/products/search", {
    params: { ...p, per_page: Math.min(p.per_page ?? 20, 50) },
  });
}

export function get1688Product(
  offerId: string | number,
  opts?: { spec_id?: string; country?: string; lang?: string },
) {
  return partzonaFetch(`/products/${offerId}`, { params: opts });
}

export function list1688CategoryProducts(
  categoryId: string | number,
  p: { type: "auto" | "retail"; page?: number; per_page?: number; language?: string },
) {
  return partzonaFetch(`/categories/${categoryId}/products`, {
    params: { ...p, per_page: Math.min(p.per_page ?? 20, 50) },
  });
}

export function get1688Categories(lang = "en") {
  return partzonaFetch("/categories", { params: { lang } });
}

/* ------------------------------- Taobao (/taobao) ------------------------------ */

export type SearchTaobaoParams = {
  keyword?: string;
  page_no?: number;
  page_size?: number;
  sort?: "PRICE_ASC" | "PRICE_DESC" | "SALE_QTY_ASC" | "SALE_QTY_DESC";
  shop_id?: number;
  language?: "en" | "vi" | "ru" | "ko" | "ja";
  include_tags?: string;
  filters?: string;
  excludeFilters?: string;
};

export function searchTaobao(p: SearchTaobaoParams) {
  // `page_size` backend validasiyasında maks 20-dir (1688-də 50) — aşsaq 422 gəlir.
  return partzonaFetch("/taobao/products/search", {
    params: { ...p, page_size: Math.min(p.page_size ?? 20, 20) },
  });
}

/** Taobao məhsul DETALI — 1688-dəki `/products/{id}` deyil, ayrıca lookup yoludur. */
export function lookupTaobaoProduct(p: {
  item_id?: string;
  item_url?: string;
  tao_password?: string;
  item_source_market?: string;
  mi_id?: string;
  /** Backend `language` gözləyir (`lang` YOX) — səhv ad sükutla ingiliscəyə düşür. */
  language?: string;
}) {
  return partzonaFetch("/taobao/products/lookup", { params: p });
}

/** Taobao tövsiyə olunan məhsullar — POST tələb edir (trend/yeni gələnlər üçün). */
export function recommendTaobaoProducts(body: Record<string, unknown> = {}) {
  return partzonaFetch("/taobao/products/recommend", { method: "POST", body });
}

/* ---------------------------------- Ümumi ------------------------------------- */

export function partzonaAccountInfo(lang = "en") {
  return partzonaFetch("/account/info", { params: { lang } });
}

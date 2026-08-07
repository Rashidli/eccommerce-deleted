import "server-only";
import { zaraFetch } from "./client";

// Zara "ES Data API" endpoint sarğıları — sahə adları CANLI cavabdan təsdiqlənib.
// Auth tələb etmir (token varsa `client.ts` özü göndərir).

/** GET /api/search?q=&section=&page=&limit= */
export function zaraSearch(params: {
  q: string;
  section?: string;
  page?: number;
  limit?: number;
  order?: string;
  imageWidth?: number;
}) {
  return zaraFetch("/search", {
    q: params.q,
    section: params.section,
    page: params.page,
    limit: params.limit,
    order: params.order,
    imageWidth: params.imageWidth ?? 400,
  });
}

/** GET /api/categories/{id}/products?page=&limit=&sort=&imageWidth= */
export function zaraCategoryProducts(params: {
  id: string;
  page?: number;
  limit?: number;
  sort?: string;
  imageWidth?: number;
}) {
  return zaraFetch(`/categories/${encodeURIComponent(params.id)}/products`, {
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    imageWidth: params.imageWidth ?? 400,
  });
}

/** GET /api/products/{seoProductId}?imageWidth= — bütün rəng/ölçü/SKU/stok. */
export function zaraProductDetail(params: {
  seoProductId: string;
  imageWidth?: number;
}) {
  return zaraFetch(`/products/${encodeURIComponent(params.seoProductId)}`, {
    imageWidth: params.imageWidth ?? 400,
  });
}

/** GET /api/categories?format=tree — bütün kateqoriya ağacı (seed üçün). */
export function zaraCategories(params?: {
  format?: string;
  section?: string;
  onlyWithProducts?: boolean;
}) {
  return zaraFetch("/categories", {
    format: params?.format ?? "tree",
    section: params?.section,
    onlyWithProducts: params?.onlyWithProducts,
  });
}

/**
 * GET /api/shipping/estimate — sifariş məbləğinə görə çatdırılma seçimləri.
 *
 * Zara-nın pulsuz çatdırılma məntiqini ÖZÜ hesablayır (30 EUR hədd, endirimli
 * məhsul həddi ləğv edir), ona görə bu qaydaları biz təkrarlamırıq.
 *
 * QEYD: `/checkout/shipping-options` REAL qiymətləri verir, amma canlı checkout
 * brauzer sessiyası tələb edir (`options: []` + hint qaytarır) — səbət anında
 * yararsızdır. Ona görə `estimate` işlədilir.
 */
export function zaraShippingEstimate(params: {
  subtotal: number;
  hasDiscountedItems?: boolean;
  method?: string;
  province?: string;
}) {
  return zaraFetch("/shipping/estimate", {
    subtotal: params.subtotal,
    hasDiscountedItems: params.hasDiscountedItems ?? false,
    method: params.method,
    province: params.province,
  });
}

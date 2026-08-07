import "server-only";
import { service1688 } from "./1688/service";
import { serviceTaobao } from "./taobao/service";
import { serviceZara } from "./zara/service";
import type { PlatformService } from "./types";

// PLATFORMA REYESTRİ — çağıran tərəf `Platform.key` verir, uyğun servisi alır.
// Yeni platforma əlavə etmək = bir qovluq (service + normalize) + bir sətir.
// Yuxarı qatda (search.ts / detail.ts / UI) HEÇ NƏ dəyişmir.

const SERVICES: Record<string, PlatformService> = {
  [service1688.key]: service1688,
  [serviceTaobao.key]: serviceTaobao,
  [serviceZara.key]: serviceZara,
};

/** Platforma servisini qaytarır; naməlum açarda `null` (çağıran nəzakətlə bitirir). */
export function getPlatformService(key: string): PlatformService | null {
  return SERVICES[key] ?? null;
}

/** İnteqrasiyası olan platforma açarları. */
export function supportedPlatforms(): string[] {
  return Object.keys(SERVICES);
}

export type { PlatformService } from "./types";

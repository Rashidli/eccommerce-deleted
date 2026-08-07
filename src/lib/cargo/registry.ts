import "server-only";
import { prisma } from "@/lib/prisma";
import type { CargoDriver } from "./driver";
import { ManualCargoDriver } from "./drivers/manual-driver";
import { HttpCargoDriver } from "./drivers/http-driver";

/**
 * Kargo driver reyestri — şirkətlər BAZADAN gəlir (qayda #4).
 *
 * Əvvəl `couriers.json`-dan oxunurdu və tariflər kodda sabit idi; yeni şirkət
 * əlavə etmək və ya qiymət dəyişmək deploy tələb edirdi. İndi hər ikisi
 * `/admin/cargo` səhifəsindən idarə olunur.
 *
 * Driver seçimi: `apiBaseUrl` doldurulubsa HTTP driver (real API çağırılır),
 * boşdursa `manual` — heç bir sorğu atılmır, sifariş əl ilə idarə olunur.
 */

/** Şirkət sətri nadir dəyişir — hər sorğuda DB-yə getməmək üçün qısa keş. */
const CACHE_TTL_MS = 60_000;
let cache: { at: number; map: Map<string, CargoDriver> } | null = null;

/** Manual driver-in ehtiyat tarifi — şirkətdə API yoxdursa təxmini hesablama. */
const FALLBACK_RATE = { baseCents: 350, perKgCents: 280, etaDays: 14 };

async function buildRegistry(): Promise<Map<string, CargoDriver>> {
  const map = new Map<string, CargoDriver>();

  const companies = await prisma.cargoCompany.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const c of companies) {
    map.set(
      c.key,
      c.apiBaseUrl
        ? new HttpCargoDriver({
            key: c.key,
            name: c.nameAz,
            apiBaseUrl: c.apiBaseUrl,
            apiToken: c.apiToken,
          })
        : new ManualCargoDriver({
            key: c.key,
            name: c.nameAz,
            ...FALLBACK_RATE,
          }),
    );
  }

  return map;
}

async function registry(): Promise<Map<string, CargoDriver>> {
  if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
    cache = { at: Date.now(), map: await buildRegistry() };
  }
  return cache.map;
}

export async function getCargoDriver(
  key: string,
): Promise<CargoDriver | undefined> {
  return (await registry()).get(key);
}

export async function listCargoDrivers(): Promise<CargoDriver[]> {
  return [...(await registry()).values()];
}

/** Admin ayarı dəyişəndə keşi dərhal sıfırlayır. */
export function invalidateCargoRegistry(): void {
  cache = null;
}

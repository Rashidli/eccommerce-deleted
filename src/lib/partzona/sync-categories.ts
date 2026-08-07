import "server-only";
import { prisma } from "@/lib/prisma";
import { get1688Categories } from "./endpoints";
import { isPermissionError, PartzonaError } from "./client";

// 1688 kateqoriya ağacını Partzona-dan çəkib `PlatformCategory`-yə yazır.
// `/categories` `lang` qəbul etdiyi üçün az/en/ru üçün 3 dəfə çəkilir → trilingual adlar (qayda #5).

const PLATFORM_KEY = "1688";
const LANGS = ["az", "en", "ru"] as const;
type Lang = (typeof LANGS)[number];

/** Partzona `/categories` cavabı (sənədlənmiş sxem). */
type RawCategory = {
  category_id: number | string;
  translated_name?: string | null;
  chinese_name?: string | null;
  parent_category_id?: number | string | null;
  leaf?: boolean;
  pool_type?: "auto" | "retail" | null;
};

type CategoriesResponse = { success?: boolean; data?: RawCategory[] };

export type SyncResult = {
  ok: boolean;
  synced: number;
  /** Uğursuzluqda səbəb (məs. 403 icazə yoxdur). */
  message?: string;
};

function listOf(res: unknown): RawCategory[] {
  const data = (res as CategoriesResponse)?.data;
  return Array.isArray(data) ? data : [];
}

export async function syncPartzonaCategories(): Promise<SyncResult> {
  const byLang = {} as Record<Lang, Map<string, RawCategory>>;

  try {
    for (const lang of LANGS) {
      const res = await get1688Categories(lang);
      byLang[lang] = new Map(
        listOf(res).map((c) => [String(c.category_id), c]),
      );
    }
  } catch (error) {
    if (isPermissionError(error)) {
      return {
        ok: false,
        synced: 0,
        message:
          "Partzona endpoint icazəsi yoxdur (403). Administratordan tokenə icazə açdırın.",
      };
    }
    if (error instanceof PartzonaError) {
      return { ok: false, synced: 0, message: `Partzona xətası: ${error.message}` };
    }
    throw error;
  }

  // Bütün dillərdən gələn ID-lərin birləşməsi
  const ids = new Set<string>();
  for (const lang of LANGS) {
    for (const id of byLang[lang].keys()) ids.add(id);
  }

  let synced = 0;
  for (const externalId of ids) {
    const base =
      byLang.en.get(externalId) ??
      byLang.az.get(externalId) ??
      byLang.ru.get(externalId);
    if (!base) continue;

    const parent = base.parent_category_id;
    const fields = {
      parentExternalId:
        parent === null || parent === undefined ? null : String(parent),
      nameAz: byLang.az.get(externalId)?.translated_name ?? null,
      nameEn: byLang.en.get(externalId)?.translated_name ?? null,
      nameRu: byLang.ru.get(externalId)?.translated_name ?? null,
      nameZh: base.chinese_name ?? null,
      isLeaf: Boolean(base.leaf),
      poolType: base.pool_type ?? null,
      raw: base as unknown as object,
    };

    await prisma.platformCategory.upsert({
      where: {
        platformKey_externalId: { platformKey: PLATFORM_KEY, externalId },
      },
      create: { platformKey: PLATFORM_KEY, externalId, ...fields },
      update: fields,
    });
    synced++;
  }

  return { ok: true, synced };
}

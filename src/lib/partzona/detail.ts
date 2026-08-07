import "server-only";
import { prisma } from "@/lib/prisma";
import { getPlatformService } from "./platforms";
import type { Lang } from "@/lib/i18n";

/**
 * MƏHSUL DETALI — platformadan asılı olmayan keş qatı.
 *
 * Hansı endpoint çağırılacağını və cavabın necə oxunacağını platforma servisi
 * bilir; burada yalnız ORTAQ qayda var: detal 24 saatdan təzədirsə bazadan
 * verilir, köhnədirsə realtime yenilənir — QİYMƏT və STOK dəyişə bilər,
 * köhnə stokla sifariş qəbul etmək olmaz.
 */

/** Məhsul detalının təzəlik müddəti (uğurlu çəkiliş). */
const DETAIL_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * UĞURSUZ cəhdin gözləmə müddəti — 24 saat DEYİL.
 *
 * Platforma müvəqqəti xəta versə (502, timeout, brauzer sessiyası yenilənir),
 * bunu bir gün keşləmək məhsulu bir günlük təsvirsiz/ölçüsüz qoyur.
 * Qısa fasilə API-ni yormur, amma tez bərpa olunmağa imkan verir.
 */
const DETAIL_RETRY_MS = 15 * 60 * 1000;

/** Geriyə çəkilmənin yuxarı həddi — sistematik blokda gündə bir cəhd bəsdir. */
const DETAIL_RETRY_MAX_MS = 24 * 60 * 60 * 1000;

/**
 * Ardıcıl uğursuzluqda gözləmə müddəti ikiqat artır: 15dəq → 30 → 1s → … → 24s.
 * Səbəb: platforma sistematik bloklaya bilər (Zara-da Akamai bot qoruması PDP
 * səhifəsini datacenter IP-lərinə vermir). Belə halda hər 15 dəqiqədən bir
 * sorğu atmaq nə bizə fayda verir, nə də mənbəyə hörmətlidir.
 */
function retryDelayMs(failures: number): number {
  const backoff = DETAIL_RETRY_MS * 2 ** Math.min(failures, 10);
  return Math.min(backoff, DETAIL_RETRY_MAX_MS);
}

/**
 * Detal keşi NƏTİCƏYƏ görə yox, SON ÇƏKİLİŞ VAXTINA görə qiymətləndirilir.
 *
 * Əvvəl "təsvir varmı" soruşulurdu; platformada təsviri olmayan məhsullar isə
 * heç vaxt "hazır" sayılmır və HƏR AÇILIŞDA yenidən çəkilirdi (2.5 saniyə).
 * `updatedAt` də uyğun deyil — adi axtarış upsert-i onu yeniləyir.
 */
function detailFresh(
  p: { detailFetchedAt: Date | null; detailFailures: number },
  succeeded: boolean,
): boolean {
  if (!p.detailFetchedAt) return false;
  const ttl = succeeded ? DETAIL_TTL_MS : retryDelayMs(p.detailFailures);
  return Date.now() - p.detailFetchedAt.getTime() < ttl;
}

/** Sonuncu çəkiliş nəsə gətiribmi — təsvir VƏ YA şəkil siyahısı doldusa bəli. */
function hasDetailData(p: {
  description: string | null;
  images: string | null;
}): boolean {
  if (p.description && p.description.trim()) return true;
  try {
    const list = JSON.parse(p.images ?? "[]");
    return Array.isArray(list) && list.length > 0;
  } catch {
    return false;
  }
}

export type DetailResult = {
  ok: boolean;
  /** true — bu çağırışda API-dən çəkildi; false — DB-dəki keşdən istifadə olundu. */
  fetched: boolean;
  message?: string;
};

export async function fetchAndCacheProductDetail(
  productId: string,
  lang: Lang,
  opts?: { force?: boolean },
): Promise<DetailResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      externalId: true,
      source: true,
      description: true,
      images: true,
      detailFetchedAt: true,
      detailFailures: true,
    },
  });

  if (!product) return { ok: false, fetched: false, message: "məhsul tapılmadı" };

  // Seed məhsulları (externalId yoxdur) və inteqrasiyası olmayan platformalar —
  // sadəcə DB-dəki data göstərilir, axın sınmır.
  const service = product.source ? getPlatformService(product.source) : null;
  if (!product.externalId || !service) {
    return { ok: true, fetched: false, message: "platforma məhsulu deyil" };
  }

  // Uğurlu çəkiliş 24 saat, uğursuz cəhd yalnız 15 dəqiqə keşlənir.
  // Fərqi `description`/`images` boşluğu ilə deyil, sonuncu cəhdin NƏTİCƏSİ ilə
  // ayırırıq: bəzi məhsulların təsviri platformada həqiqətən yoxdur.
  if (!opts?.force && detailFresh(product, hasDetailData(product))) {
    return { ok: true, fetched: false, message: "keşdən" };
  }

  const patch = await service.productDetail({
    externalId: product.externalId,
    lang,
  });
  if (!patch) {
    // Uğursuz cəhd qeyd olunur ki, API hər açılışda yorulmasın — amma yalnız
    // DETAIL_RETRY_MS (15 dəq) qədər, 24 saat yox.
    await prisma.product.update({
      where: { id: product.id },
      data: { detailFetchedAt: new Date(), detailFailures: { increment: 1 } },
    });
    return { ok: false, fetched: false, message: "detal alınmadı" };
  }

  await prisma.product.update({
    where: { id: product.id },
    // Uğurlu cəhd sayğacı sıfırlayır.
    data: {
      ...(patch as object),
      detailFetchedAt: new Date(),
      detailFailures: 0,
    } as never,
  });

  return { ok: true, fetched: true };
}

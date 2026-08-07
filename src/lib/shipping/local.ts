import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * YERLİ (Azərbaycan daxili) ÇATDIRILMA — müştəri tərəfi.
 *
 * Bu, platforma çatdırılmasından TAM AYRI bir mərhələdir:
 *
 *   [platforma → bizim anbar]   `quote.ts`  — CNY / EUR, platforma başına
 *   [bizim anbar → müştəri]     BU FAYL     — AZN, rayon tarifi və ya PUDO
 *
 * İki mərhələnin valyutası fərqlidir, ona görə məbləğlər BİR RƏQƏMƏ TOPLANMIR.
 * Yekunda AZN öz sətrində, CNY/EUR öz sətirlərində göstərilir — cross-currency
 * cəm maliyyə səhvidir (FX qatı yalnız GÖSTƏRİŞ üçündür, tutulan məbləğ deyil).
 */

export type DeliveryMethod = "courier" | "pickup";

export type LocalDeliveryQuote = {
  method: DeliveryMethod;
  amountCents: number;
  currency: string;
  /** İstifadəçiyə göstərilən ad — rayon və ya məntəqə adı. */
  label: string;
  isFree: boolean;
};

export type LocalDeliveryInput = {
  method: DeliveryMethod;
  /** Kuryer üçün — müştərinin seçdiyi ünvan. */
  addressId?: string | null;
  /** PUDO üçün — seçilmiş məntəqə. */
  pickupPointId?: string | null;
  /** Ünvanın həqiqətən bu istifadəçiyə aid olduğunu yoxlamaq üçün. */
  userId: string;
  /**
   * Seçilmiş kargo şirkəti — tarif ona görə dəyişir.
   *
   * Verilməsə (və ya həmin şirkət üçün sətir olmasa) rayonun ÜMUMİ tarifi
   * işləyir. Beləcə hər şirkət üçün bütün rayonları doldurmaq məcburiyyəti
   * yaranmır və köhnə sifariş axını olduğu kimi işləyir.
   */
  cargoCompanyId?: string | null;
};

/**
 * Yerli çatdırılma haqqını BAZADAN hesablayır.
 *
 * Client-in göndərdiyi məbləğ HEÇ VAXT qəbul edilmir — yalnız hansı ünvanın /
 * məntəqənin seçildiyi qəbul edilir, qiymət burada tapılır. Ünvan başqasınındırsa
 * `null` qayıdır (IDOR qorunması).
 */
export async function quoteLocalDelivery(
  input: LocalDeliveryInput,
): Promise<LocalDeliveryQuote | null> {
  if (input.method === "pickup") {
    if (!input.pickupPointId) return null;
    const point = await prisma.pickupPoint.findFirst({
      where: { id: input.pickupPointId, isActive: true },
      select: { nameAz: true, priceCents: true, currency: true },
    });
    if (!point) return null;

    return {
      method: "pickup",
      amountCents: point.priceCents,
      currency: point.currency,
      label: point.nameAz,
      isFree: point.priceCents === 0,
    };
  }

  if (!input.addressId) return null;

  // Ünvan MÜTLƏQ bu istifadəçinin olmalıdır — başqasının ünvanına sifariş
  // yaratmaq (və onun tarifini almaq) mümkün olmamalıdır.
  const address = await prisma.address.findFirst({
    where: { id: input.addressId, userId: input.userId },
    select: {
      line: true,
      district: {
        select: {
          id: true,
          nameAz: true,
          priceCents: true,
          isFree: true,
          currency: true,
        },
      },
    },
  });
  if (!address) return null;

  // Rayon seçilməyibsə (köhnə ünvanlar) tarif tapıla bilmir — sıfır YAZMIRIQ,
  // `null` qaytarırıq ki, çağıran "rayon seçin" desin. Səssiz sıfır müştəriyə
  // pulsuz çatdırılma vəd edərdi.
  if (!address.district) return null;

  const d = address.district;

  // ŞİRKƏT TARİFİ RAYONUN ÜMUMİ TARİFİNDƏN ÜSTÜNDÜR.
  //
  // Şirkətlər eyni rayona eyni qiymətə getmir. Sətir yoxdursa rayonun öz
  // qiyməti qalır — yəni bu axtarış heç nəyi sındırmır, sadəcə varsa daha
  // dəqiq qiyməti götürür.
  const override = input.cargoCompanyId
    ? await prisma.districtTariff.findFirst({
        where: {
          companyId: input.cargoCompanyId,
          districtId: d.id,
          isActive: true,
        },
        select: { priceCents: true, isFree: true, currency: true },
      })
    : null;

  const tariff = override ?? d;
  const free = tariff.isFree || tariff.priceCents === 0;

  return {
    method: "courier",
    amountCents: free ? 0 : tariff.priceCents,
    currency: tariff.currency,
    label: d.nameAz,
    isFree: free,
  };
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { pickLang } from "@/lib/data/pick-lang";
import { formatMoney } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

/**
 * ÇATDIRILMA COĞRAFİYASI — şəhər / rayon / PUDO oxu qatı.
 *
 * UI birbaşa Prisma çağırmır (qayda: data-access qatından keçir) və siyahılar
 * KODDA sabit deyil — hamısı bazadan gəlir (qayda #4).
 */

export type CityDTO = {
  id: string;
  name: string;
  districts: DistrictDTO[];
};

export type DistrictDTO = {
  id: string;
  cityId: string;
  name: string;
  /** Kuryer tarifi — formatlanmış (məs. "₼3.00"). Pulsuzdursa boş sətir. */
  fee: string;
  feeCents: number;
  isFree: boolean;
  currency: string;
};

export type PickupPointDTO = {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
  districtName: string | null;
  address: string;
  workHours: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  fee: string;
  feeCents: number;
  currency: string;
};

/** Aktiv şəhərlər + rayonları (kuryer seçimi üçün). */
export async function getCities(lang: Lang): Promise<CityDTO[]> {
  const rows = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      districts: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    name: pickLang(c, "name", lang) || c.nameAz,
    districts: c.districts.map((d) => toDistrictDTO(d, lang)),
  }));
}

type DistrictRow = {
  id: string;
  cityId: string;
  nameAz: string;
  nameEn: string;
  nameRu: string;
  priceCents: number;
  isFree: boolean;
  currency: string;
};

function toDistrictDTO(d: DistrictRow, lang: Lang): DistrictDTO {
  return {
    id: d.id,
    cityId: d.cityId,
    name: pickLang(d, "name", lang) || d.nameAz,
    feeCents: d.isFree ? 0 : d.priceCents,
    isFree: d.isFree || d.priceCents === 0,
    fee: formatMoney(d.isFree ? 0 : d.priceCents, d.currency),
    currency: d.currency,
  };
}

/** Aktiv PUDO məntəqələri. */
export async function getPickupPoints(lang: Lang): Promise<PickupPointDTO[]> {
  const rows = await prisma.pickupPoint.findMany({
    where: { isActive: true, city: { isActive: true } },
    orderBy: [{ sortOrder: "asc" }],
    include: { city: true, district: true },
  });

  return rows.map((p) => ({
    id: p.id,
    name: pickLang(p, "name", lang) || p.nameAz,
    cityId: p.cityId,
    cityName: pickLang(p.city, "name", lang) || p.city.nameAz,
    districtName: p.district
      ? pickLang(p.district, "name", lang) || p.district.nameAz
      : null,
    address: p.address,
    workHours: p.workHours,
    phone: p.phone,
    lat: p.lat,
    lng: p.lng,
    feeCents: p.priceCents,
    currency: p.currency,
    fee: formatMoney(p.priceCents, p.currency),
  }));
}

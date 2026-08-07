import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * AZƏRBAYCAN COĞRAFİYASI — şəhər / rayon ağacı və PUDO məntəqələri.
 *
 * Niyə seed skripti: siyahı KODDA sabit deyil, bazaya yazılır (qayda #4).
 * Skript yalnız BAŞLANĞIC datanı qoyur; bundan sonra admin `/admin/delivery`
 * səhifəsindən idarə edir. Təkrar işlədilə bilər (upsert) — mövcud tarifləri
 * ƏZMİR, çünki admin onları dəyişmiş ola bilər.
 *
 * ⚠ TARİFLƏR ŞƏRTİDİR. Aşağıdakı qiymətlər real kargo müqaviləsindən gəlmir —
 * struktur işləsin deyə qoyulmuş başlanğıc dəyərlərdir. Admin real qiymətləri
 * təyin etməlidir.
 */

type DistrictSeed = {
  az: string;
  en: string;
  ru: string;
  /** Kuryer tarifi — qəpiklə (AZN sentləri). */
  priceCents: number;
};

type CitySeed = {
  az: string;
  en: string;
  ru: string;
  districts: DistrictSeed[];
};

/** Bakının mərkəzi rayonları — ucuz tarif. */
const BAKU_CENTRAL = 300;
/** Bakının kənar rayonları. */
const BAKU_OUTER = 500;
/** Region şəhərləri. */
const REGION = 800;
/** Uzaq regionlar. */
const REGION_FAR = 1000;

const CITIES: CitySeed[] = [
  {
    az: "Bakı",
    en: "Baku",
    ru: "Баку",
    districts: [
      { az: "Səbail", en: "Sabail", ru: "Сабаил", priceCents: BAKU_CENTRAL },
      { az: "Nəsimi", en: "Nasimi", ru: "Насими", priceCents: BAKU_CENTRAL },
      { az: "Yasamal", en: "Yasamal", ru: "Ясамал", priceCents: BAKU_CENTRAL },
      { az: "Nərimanov", en: "Narimanov", ru: "Нариманов", priceCents: BAKU_CENTRAL },
      { az: "Nizami", en: "Nizami", ru: "Низами", priceCents: BAKU_OUTER },
      { az: "Xətai", en: "Khatai", ru: "Хатаи", priceCents: BAKU_OUTER },
      { az: "Binəqədi", en: "Binagadi", ru: "Бинагади", priceCents: BAKU_OUTER },
      { az: "Sabunçu", en: "Sabunchu", ru: "Сабунчу", priceCents: BAKU_OUTER },
      { az: "Suraxanı", en: "Surakhani", ru: "Сураханы", priceCents: BAKU_OUTER },
      { az: "Qaradağ", en: "Garadagh", ru: "Гарадаг", priceCents: BAKU_OUTER },
      { az: "Xəzər", en: "Khazar", ru: "Хазар", priceCents: BAKU_OUTER },
      { az: "Pirallahı", en: "Pirallahi", ru: "Пираллахы", priceCents: BAKU_OUTER },
    ],
  },
  { az: "Sumqayıt", en: "Sumgait", ru: "Сумгаит", districts: [center(REGION)] },
  { az: "Xırdalan", en: "Khirdalan", ru: "Хырдалан", districts: [center(REGION)] },
  { az: "Gəncə", en: "Ganja", ru: "Гянджа", districts: [center(REGION)] },
  { az: "Mingəçevir", en: "Mingachevir", ru: "Мингечевир", districts: [center(REGION)] },
  { az: "Şirvan", en: "Shirvan", ru: "Ширван", districts: [center(REGION)] },
  { az: "Şəki", en: "Shaki", ru: "Шеки", districts: [center(REGION_FAR)] },
  { az: "Lənkəran", en: "Lankaran", ru: "Ленкорань", districts: [center(REGION_FAR)] },
  { az: "Naxçıvan", en: "Nakhchivan", ru: "Нахчыван", districts: [center(REGION_FAR)] },
  { az: "Quba", en: "Guba", ru: "Губа", districts: [center(REGION_FAR)] },
  { az: "Qəbələ", en: "Gabala", ru: "Габала", districts: [center(REGION_FAR)] },
  { az: "Zaqatala", en: "Zagatala", ru: "Загатала", districts: [center(REGION_FAR)] },
  { az: "Yevlax", en: "Yevlakh", ru: "Евлах", districts: [center(REGION)] },
  { az: "Bərdə", en: "Barda", ru: "Барда", districts: [center(REGION)] },
  { az: "Göyçay", en: "Goychay", ru: "Гейчай", districts: [center(REGION)] },
  { az: "Salyan", en: "Salyan", ru: "Сальяны", districts: [center(REGION)] },
  { az: "Masallı", en: "Masalli", ru: "Масаллы", districts: [center(REGION_FAR)] },
  { az: "Astara", en: "Astara", ru: "Астара", districts: [center(REGION_FAR)] },
  { az: "İmişli", en: "Imishli", ru: "Имишли", districts: [center(REGION)] },
  { az: "Sabirabad", en: "Sabirabad", ru: "Сабирабад", districts: [center(REGION)] },
  { az: "Ağdaş", en: "Aghdash", ru: "Агдаш", districts: [center(REGION)] },
];

/** Region şəhərlərinin tək rayonu — "Şəhər mərkəzi". */
function center(priceCents: number): DistrictSeed {
  return { az: "Şəhər mərkəzi", en: "City centre", ru: "Центр города", priceCents };
}

/**
 * PUDO məntəqələri — müştəri özü gəlib götürür.
 * Kod sabitdir (`upsert` açarı), qalan sahələr admin tərəfindən dəyişilə bilər.
 */
const PICKUPS = [
  {
    code: "PUDO-BAKU-28MALL",
    az: "28 Mall — 1-ci mərtəbə",
    en: "28 Mall — 1st floor",
    ru: "28 Mall — 1-й этаж",
    city: "Bakı",
    district: "Nəsimi",
    address: "Azadlıq pr. 15, 28 Mall",
    workHours: "10:00–22:00",
    phone: "+994 12 000 00 01",
    lat: 40.3789,
    lng: 49.8478,
  },
  {
    code: "PUDO-BAKU-GANJLIK",
    az: "Gənclik Mall — giriş",
    en: "Ganjlik Mall — entrance",
    ru: "Ganjlik Mall — вход",
    city: "Bakı",
    district: "Nərimanov",
    address: "Fətəli xan Xoyski 4, Gənclik Mall",
    workHours: "10:00–22:00",
    phone: "+994 12 000 00 02",
    lat: 40.4009,
    lng: 49.8557,
  },
  {
    code: "PUDO-BAKU-SEBAIL",
    az: "Sahil məntəqəsi",
    en: "Sahil point",
    ru: "Пункт Сахиль",
    city: "Bakı",
    district: "Səbail",
    address: "Neftçilər pr. 32",
    workHours: "09:00–19:00",
    phone: "+994 12 000 00 03",
    lat: 40.3714,
    lng: 49.8412,
  },
  {
    code: "PUDO-SUMQAYIT-01",
    az: "Sumqayıt mərkəz",
    en: "Sumgait centre",
    ru: "Сумгаит центр",
    city: "Sumqayıt",
    district: "Şəhər mərkəzi",
    address: "Sülh küç. 12",
    workHours: "10:00–20:00",
    phone: "+994 18 000 00 01",
    lat: 40.5892,
    lng: 49.6683,
  },
  {
    code: "PUDO-GENCE-01",
    az: "Gəncə mərkəz",
    en: "Ganja centre",
    ru: "Гянджа центр",
    city: "Gəncə",
    district: "Şəhər mərkəzi",
    address: "Atatürk pr. 45",
    workHours: "10:00–20:00",
    phone: "+994 22 000 00 01",
    lat: 40.6828,
    lng: 46.3606,
  },
];

export type GeoSeedResult = {
  cities: number;
  districts: number;
  pickups: number;
};

/**
 * Coğrafiyanı bazaya yazır.
 *
 * `force` false (default) — MÖVCUD sətirlərin tarifi TOXUNULMUR, yalnız
 * adlar yenilənir. Səbəb: admin qiyməti dəyişəndən sonra skript təkrar
 * işlədilsə, onun işini silməməlidir.
 */
export async function seedGeo(opts?: { force?: boolean }): Promise<GeoSeedResult> {
  let cities = 0;
  let districts = 0;
  let pickups = 0;

  for (const [ci, c] of CITIES.entries()) {
    // `City`-də təbii unikal açar yoxdur — ada görə axtarırıq.
    const existing = await prisma.city.findFirst({ where: { nameAz: c.az } });
    const city = existing
      ? await prisma.city.update({
          where: { id: existing.id },
          data: { nameEn: c.en, nameRu: c.ru, sortOrder: ci },
        })
      : await prisma.city.create({
          data: { nameAz: c.az, nameEn: c.en, nameRu: c.ru, sortOrder: ci },
        });
    cities++;

    for (const [di, d] of c.districts.entries()) {
      const found = await prisma.district.findUnique({
        where: { cityId_nameAz: { cityId: city.id, nameAz: d.az } },
      });

      if (found) {
        await prisma.district.update({
          where: { id: found.id },
          data: {
            nameEn: d.en,
            nameRu: d.ru,
            sortOrder: di,
            // Tarif YALNIZ `force` ilə əzilir — admin dəyişikliyi qorunur.
            ...(opts?.force ? { priceCents: d.priceCents, isFree: false } : {}),
          },
        });
      } else {
        await prisma.district.create({
          data: {
            cityId: city.id,
            nameAz: d.az,
            nameEn: d.en,
            nameRu: d.ru,
            priceCents: d.priceCents,
            sortOrder: di,
          },
        });
      }
      districts++;
    }
  }

  for (const [pi, p] of PICKUPS.entries()) {
    const city = await prisma.city.findFirst({ where: { nameAz: p.city } });
    if (!city) continue;
    const district = await prisma.district.findUnique({
      where: { cityId_nameAz: { cityId: city.id, nameAz: p.district } },
    });

    const data = {
      nameAz: p.az,
      nameEn: p.en,
      nameRu: p.ru,
      cityId: city.id,
      districtId: district?.id ?? null,
      address: p.address,
      workHours: p.workHours,
      phone: p.phone,
      lat: p.lat,
      lng: p.lng,
      sortOrder: pi,
    };

    await prisma.pickupPoint.upsert({
      where: { code: p.code },
      create: { code: p.code, ...data },
      update: data,
    });
    pickups++;
  }

  return { cities, districts, pickups };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { invalidateCargoRegistry } from "@/lib/cargo/registry";

// Kargo şirkətlərinin idarəetməsi — YALNIZ admin sessiyası (qayda #1).
//
// SİRLƏR: `apiToken` və `webhookSecret` heç vaxt oxunmur/qaytarılmır.
// Yalnız YAZILIR: boş göndərilsə mövcud dəyər saxlanılır, doldurulsa əvəzlənir.
// Beləliklə admin səhifəsi açılanda sirr HTML-ə düşmür.

function revalidateCargo() {
  revalidatePath("/admin/cargo");
  // Driver reyestri 60 saniyə keşlənir — admin dəyişiklikdən sonra dərhal
  // yenilənməsə, admin "saxladım, işləmir" görüntüsü alır.
  invalidateCargoRegistry();
}

export async function toggleCargoCompany(key: string, isActive: boolean) {
  await requireAdmin();
  await prisma.cargoCompany.update({ where: { key }, data: { isActive } });
  revalidateCargo();
}

export async function toggleCargoBranch(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.cargoBranch.update({ where: { id }, data: { isActive } });
  revalidateCargo();
}

/**
 * Şirkətin API ayarları. Boş sirr sahəsi MÖVCUDU SAXLAYIR.
 *
 * `<form action={...}>` üçün dəyər QAYTARMIR — React server action-dan
 * qaytarılan obyekti serialize etməyə çalışır və tip xətası verir.
 */
export async function updateCargoCompany(formData: FormData): Promise<void> {
  await requireAdmin();

  const key = String(formData.get("key") ?? "").trim();
  if (!key) return;

  const apiBaseUrl = String(formData.get("apiBaseUrl") ?? "").trim();
  const driverKey = String(formData.get("driverKey") ?? "manual").trim();
  const apiToken = String(formData.get("apiToken") ?? "").trim();
  const webhookSecret = String(formData.get("webhookSecret") ?? "").trim();

  await prisma.cargoCompany.update({
    where: { key },
    data: {
      apiBaseUrl: apiBaseUrl || null,
      driverKey: driverKey || "manual",
      // Boş qalıbsa toxunmuruq — admin sirri təsadüfən silməsin.
      ...(apiToken ? { apiToken } : {}),
      ...(webhookSecret ? { webhookSecret } : {}),
    },
  });

  revalidateCargo();
}

/**
 * Filialları şirkətin API-sindən çəkib bazaya yazır.
 *
 * Rayon ADLA uyğunlaşdırılır — tapılmasa filial yenə yazılır, sadəcə rayonsuz
 * qalır (çatdırılma tarifi hesablana bilməz, admin əl ilə bağlamalıdır).
 * Səssizcə atmaq daha pis olardı: filial yoxa çıxardı.
 */
/**
 * YENİ KARGO ŞİRKƏTİ.
 *
 * Sürücü qatı (`src/lib/cargo/registry.ts`) tamamilə BAZADAN qurulur: API
 * ünvanı verilibsə HTTP sürücüsü, verilməyibsə əl sürücüsü işə düşür. Yəni
 * yeni şirkət əlavə etmək üçün kod dəyişikliyi lazım deyil — burada sətir
 * yaratmaq kifayətdir.
 *
 * Açar (`key`) sistem daxilində şirkəti tanıyır və sifarişlərdə saxlanılır,
 * ona görə sonradan dəyişilməməlidir.
 */
export async function createCargoCompany(formData: FormData) {
  await requireAdmin();

  const nameAz = String(formData.get("nameAz") ?? "").trim();
  if (!nameAz) return;

  const raw =
    String(formData.get("key") ?? "").trim().toLowerCase() ||
    nameAz
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);

  // Açar unikaldır — toqquşarsa sonuna say əlavə olunur.
  let key = raw || "kargo";
  for (let i = 2; await prisma.cargoCompany.findUnique({ where: { key } }); i++) {
    key = `${raw}-${i}`;
  }

  const apiBaseUrl = String(formData.get("apiBaseUrl") ?? "").trim();

  await prisma.cargoCompany.create({
    data: {
      key,
      nameAz,
      // Ad üç dildə lazımdır; boş qalanlar AZ adı ilə doldurulur ki, heç bir
      // dildə boş ad görünməsin.
      nameEn: String(formData.get("nameEn") ?? "").trim() || nameAz,
      nameRu: String(formData.get("nameRu") ?? "").trim() || nameAz,
      apiBaseUrl: apiBaseUrl || null,
      apiToken: String(formData.get("apiToken") ?? "").trim() || null,
      // API ünvanı yoxdursa əl sürücüsü — tarif təxmini hesablanır.
      driverKey: apiBaseUrl ? "http" : "manual",
      isActive: true,
    },
  });

  revalidateCargo();
}

/**
 * ŞİRKƏTİ SİLİR.
 *
 * SİFARİŞİ OLAN şirkət SİLİNMİR: `Order.cargoCompanyId` ona baxır və silinsə
 * müştərinin sifarişində "kimin daşıdığı" itir. Belə halda şirkət deaktiv
 * olunur — yeni sifarişlərdə seçilmir, köhnələr salamat qalır.
 */
export async function deleteCargoCompany(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const used = await prisma.order.count({ where: { cargoCompanyId: id } });
  if (used > 0) {
    await prisma.cargoCompany.update({ where: { id }, data: { isActive: false } });
    revalidateCargo();
    return;
  }

  await prisma.cargoCompany.delete({ where: { id } });
  revalidateCargo();
}

export async function syncCargoBranches(key: string) {
  await requireAdmin();

  const company = await prisma.cargoCompany.findUnique({ where: { key } });
  if (!company) return { ok: false, error: "company_not_found" };
  if (!company.apiBaseUrl) return { ok: false, error: "no_api_url" };

  const { getCargoDriver } = await import("@/lib/cargo/registry");
  const driver = await getCargoDriver(company.driverKey);
  if (!driver?.fetchBranches) return { ok: false, error: "driver_unsupported" };

  let rows;
  try {
    rows = await driver.fetchBranches();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch_failed" };
  }

  const districts = await prisma.district.findMany({
    select: { id: true, nameAz: true },
  });
  const byName = new Map(
    districts.map((d) => [d.nameAz.toLocaleLowerCase("az"), d.id]),
  );

  let saved = 0;
  let unmatched = 0;
  for (const [i, b] of rows.entries()) {
    const districtId = b.districtName
      ? byName.get(b.districtName.toLocaleLowerCase("az")) ?? null
      : null;
    if (b.districtName && !districtId) unmatched++;

    await prisma.cargoBranch.upsert({
      where: {
        companyId_externalCode: {
          companyId: company.id,
          externalCode: b.externalCode,
        },
      },
      create: {
        companyId: company.id,
        externalCode: b.externalCode,
        nameAz: b.name,
        nameEn: b.name,
        nameRu: b.name,
        districtId,
        address: b.address ?? "",
        lat: b.lat ?? null,
        lng: b.lng ?? null,
        workHours: b.workHours ?? null,
        phone: b.phone ?? null,
        sortOrder: i,
        raw: b.raw as object,
      },
      update: {
        nameAz: b.name,
        districtId,
        address: b.address ?? "",
        lat: b.lat ?? null,
        lng: b.lng ?? null,
        workHours: b.workHours ?? null,
        phone: b.phone ?? null,
        sortOrder: i,
        raw: b.raw as object,
      },
    });
    saved++;
  }

  revalidateCargo();
  return { ok: true, saved, unmatched };
}

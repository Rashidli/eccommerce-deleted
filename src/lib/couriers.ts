import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Kargo şirkətləri və filialları — BAZADAN (qayda #4).
 *
 * Əvvəl `src/data/couriers.json`-dan oxunurdu: yeni filial açılanda, ünvan və
 * ya iş saatı dəyişəndə deploy lazım gəlirdi. İndi admin `/admin/cargo`
 * səhifəsindən idarə edir; `npm run cargo:seed` köhnə JSON-u bir dəfə köçürdü.
 */

export interface Branch {
  id: string;
  name: string;
  address: string;
  hours: string;
  lat: number;
  lng: number;
}

export interface Courier {
  id: string;
  name: string;
  note: string;
  branches: Branch[];
}

/** Aktiv şirkətlər və onların aktiv filialları. */
export async function getCouriers(): Promise<Courier[]> {
  const rows = await prisma.cargoCompany.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      branches: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return rows.map((c) => ({
    id: c.key,
    name: c.nameAz,
    note: c.noteAz ?? "",
    branches: c.branches.map((b) => ({
      id: b.externalCode,
      name: b.nameAz,
      address: b.address,
      hours: b.workHours ?? "",
      // Xəritə komponenti rəqəm gözləyir; koordinat yoxdursa Bakı mərkəzi.
      lat: b.lat ?? 40.4093,
      lng: b.lng ?? 49.8671,
    })),
  }));
}

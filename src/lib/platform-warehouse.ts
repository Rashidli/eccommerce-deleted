import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * PLATFORMA ANBARI — bizim öz anbarımızın ünvanı (`Platform.warehouse`).
 *
 * Zara sifarişində çatdırılma ünvanı HƏMİŞƏ buradır: mal İspaniyadakı
 * anbarımıza gəlir, oradan Azərbaycana yola düşür. Sifarişdən sifarişə
 * dəyişən yeganə şey ad/soyaddır — adın əvvəlinə müştəri kodu yazılır
 * (`@/lib/customer-code`) ki, anbar paketin kimə aid olduğunu bilsin.
 *
 * Ünvan KODDA sabit deyil (qayda #4): anbar köçsə, telefon dəyişsə deploy
 * lazım gəlməsin — admin bazadan dəyişir.
 */

export type PlatformWarehouse = {
  /** Anbarın qısa adı — operator panelində göstərilir. */
  label?: string;
  /** Küçə + bina. */
  street: string;
  /** Poçt indeksi. */
  postalCode: string;
  city: string;
  /** ISO-2 ölkə kodu (ES, CN, ...). */
  country: string;
  /** Beynəlxalq formatda telefon. */
  phone?: string;
};

function isWarehouse(v: unknown): v is PlatformWarehouse {
  if (!v || typeof v !== "object") return false;
  const w = v as Record<string, unknown>;
  return (
    typeof w.street === "string" &&
    typeof w.postalCode === "string" &&
    typeof w.city === "string" &&
    typeof w.country === "string"
  );
}

/**
 * Platformanın anbarı. Təyin olunmayıbsa `null` — çağıran tərəf DAYANMALIDIR.
 * Uydurma ünvanla sifariş vermək malın itməsi deməkdir.
 */
export async function getPlatformWarehouse(
  platformKey: string,
): Promise<PlatformWarehouse | null> {
  const row = await prisma.platform.findUnique({
    where: { key: platformKey },
    select: { warehouse: true },
  });
  return isWarehouse(row?.warehouse) ? row.warehouse : null;
}

/** Bir sətirlik oxunaqlı ünvan — jurnal və operator paneli üçün. */
export function formatWarehouse(w: PlatformWarehouse): string {
  return [w.street, `${w.postalCode} ${w.city}`, w.country, w.phone]
    .filter(Boolean)
    .join(", ");
}

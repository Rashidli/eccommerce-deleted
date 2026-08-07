/**
 * Zara anbarının ünvanını bazaya yazır (`Platform.warehouse`).
 *
 *   npm run warehouse:seed
 *
 * Bu, BİZİM İspaniyadakı anbarımızdır — Zara sifarişlərinin çatdırılma
 * ünvanı həmişə budur. Ünvan dəyişsə bu skript yenidən işlədilir və ya
 * admin bazadan düzəldir; kodda sabit saxlanmır (qayda #4).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import type { PlatformWarehouse } from "../src/lib/platform-warehouse";

const ZARA_WAREHOUSE: PlatformWarehouse = {
  label: "E-Commerce İspaniya anbarı",
  street: "Calle Indústria 60/A",
  postalCode: "08860",
  city: "Castelldefels",
  country: "ES",
  phone: "+34 654 95 55 85",
};

async function main() {
  const updated = await prisma.platform.update({
    where: { key: "zara" },
    data: { warehouse: ZARA_WAREHOUSE },
    select: { key: true, warehouse: true },
  });
  console.log("anbar yazıldı →", updated.key);
  console.log(JSON.stringify(updated.warehouse, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

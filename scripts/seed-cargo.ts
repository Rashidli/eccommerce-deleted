/**
 * Kargo şirkətlərini və filiallarını `src/data/couriers.json`-dan BAZAYA köçürür.
 *
 *   npm run cargo:seed
 *
 * İdempotentdir: `(companyId, externalCode)` üzrə upsert edir.
 * Filialın ünvanındakı rayon adı bazadakı `District` ilə uyğunlaşdırılır —
 * çatdırılma tarifi rayona görə hesablandığı üçün bu əlaqə vacibdir.
 *
 * Bu skript işlədikdən sonra `couriers.json` silinə bilər.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

type JsonBranch = {
  id: string;
  name: string;
  address?: string;
  hours?: string;
  phone?: string;
  lat?: number;
  lng?: number;
};
type JsonCourier = {
  id: string;
  name: string;
  note?: string;
  branches?: JsonBranch[];
};

/**
 * "Azərbaycan pr. 12, Nəsimi r., Bakı" → "Nəsimi"
 *
 * DİQQƏT: sadə `(.+?)\s*r\.` işləmir — "pr." (prospekt) də "r." ilə bitir və
 * regex "Azərbaycan p" tuturdu. Ona görə rayon VERGÜLDƏN sonra axtarılır və
 * "r."-dən əvvəl boşluq tələb olunur.
 */
function districtFromAddress(address: string): string | null {
  const m = address.match(/,\s*([^,]+?)\s+r\./);
  return m ? m[1].trim() : null;
}

async function main() {
  const file = path.join(process.cwd(), "src", "data", "couriers.json");
  const couriers = JSON.parse(await readFile(file, "utf8")) as JsonCourier[];

  // Rayonları bir dəfə yükləyib adla uyğunlaşdırırıq (hər filial üçün sorğu atmaq
  // lazım deyil; ad təkrarlanarsa ilk uyğun gələn götürülür).
  const districts = await prisma.district.findMany({
    select: { id: true, nameAz: true },
  });
  const byName = new Map(
    districts.map((d) => [d.nameAz.toLocaleLowerCase("az"), d.id]),
  );

  let companies = 0;
  let branches = 0;
  let unmatched = 0;

  for (const [i, c] of couriers.entries()) {
    const company = await prisma.cargoCompany.upsert({
      where: { key: c.id },
      create: {
        key: c.id,
        nameAz: c.name,
        nameEn: c.name,
        nameRu: c.name,
        noteAz: c.note ?? null,
        noteEn: c.note ?? null,
        noteRu: c.note ?? null,
        // Real API qoşulana qədər "manual" driver — sifariş əl ilə idarə olunur.
        driverKey: "manual",
        sortOrder: i,
      },
      // Mövcud şirkətin API açarlarına və adına TOXUNMURUQ — admin dəyişibsə
      // təkrar seed onu geri qaytarmamalıdır.
      update: { sortOrder: i },
    });
    companies++;

    for (const [j, b] of (c.branches ?? []).entries()) {
      const address = b.address ?? "";
      const dName = districtFromAddress(address);
      const districtId = dName
        ? byName.get(dName.toLocaleLowerCase("az")) ?? null
        : null;
      if (dName && !districtId) unmatched++;

      await prisma.cargoBranch.upsert({
        where: {
          companyId_externalCode: {
            companyId: company.id,
            externalCode: b.id,
          },
        },
        create: {
          companyId: company.id,
          externalCode: b.id,
          nameAz: b.name,
          nameEn: b.name,
          nameRu: b.name,
          districtId,
          address,
          lat: b.lat ?? null,
          lng: b.lng ?? null,
          workHours: b.hours ?? null,
          phone: b.phone ?? null,
          sortOrder: j,
          raw: b as unknown as object,
        },
        update: {
          nameAz: b.name,
          address,
          districtId,
          lat: b.lat ?? null,
          lng: b.lng ?? null,
          workHours: b.hours ?? null,
          sortOrder: j,
          raw: b as unknown as object,
        },
      });
      branches++;
    }
  }

  console.log(
    `şirkət: ${companies} · filial: ${branches}` +
      (unmatched ? ` · rayonu tapılmayan: ${unmatched}` : ""),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

/**
 * Azərbaycan şəhər/rayon ağacını və PUDO məntəqələrini bazaya yazır.
 *
 *   npm run geo:seed            → adları yenilə, TARİFLƏRƏ toxunma
 *   npm run geo:seed -- --force → tarifləri də başlanğıc dəyərlərə qaytar
 *
 * Təkrar işlədilə bilər. `--force` olmadan admin-in təyin etdiyi qiymətlər
 * qorunur — skript onların üstündən yazmır.
 */
import "dotenv/config";
import { seedGeo } from "../src/lib/data/geo-seed";

const force = process.argv.includes("--force");

console.log(
  `coğrafiya seed — ${force ? "tariflər DƏ sıfırlanır" : "yalnız adlar (tariflər qorunur)"}`,
);

seedGeo({ force })
  .then((r) => {
    console.log(
      `  şəhər: ${r.cities} · rayon: ${r.districts} · PUDO: ${r.pickups}`,
    );
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

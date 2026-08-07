/**
 * ALIŞ JOB-UNUN JURNALI.
 *
 *   npm run purchase:log             → sonuncu icranın bütün addımları
 *   npm run purchase:log -- <runId>  → konkret icra
 *
 * Xəta olanda ilk baxılacaq yer budur: hansı addımda dayandığını və səbəbini
 * göstərir. Ödəniş statusları da yanında çap olunur.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  let runId = process.argv[2];
  if (!runId) {
    const last = await prisma.purchaseLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { runId: true },
    });
    runId = last?.runId ?? "";
  }
  if (!runId) {
    console.log("Jurnal boşdur — job heç işə düşməyib.");
    return;
  }

  const rows = await prisma.purchaseLog.findMany({
    where: { runId },
    orderBy: { createdAt: "asc" },
  });

  console.log(`run id: ${runId}\n`);
  for (const r of rows) {
    const mark = r.outcome === "ok" ? "✓" : r.outcome === "skip" ? "·" : "✗";
    console.log(`  ${mark} ${r.step.padEnd(14)} ${r.message}`);
    if (r.detail) console.log(`      ${JSON.stringify(r.detail)}`);
  }

  const po = await prisma.platformOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { status: true, externalOrderId: true, totalCents: true, currency: true, createdAt: true },
  });
  if (po.length > 0) {
    console.log("\n=== son alış cəhdləri ===");
    for (const p of po) {
      console.log(
        `  ${p.status.padEnd(9)} ${(p.externalOrderId ?? "(nömrə yox)").padEnd(20)} ` +
          `${(p.totalCents / 100).toFixed(2)} ${p.currency}  ${p.createdAt.toISOString().slice(0, 19)}`,
      );
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

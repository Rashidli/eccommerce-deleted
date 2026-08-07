/**
 * ZARA ALIŞ JOB-U — komanda sətri.
 *
 *   npm run purchase:zara                 → QURU İCRA (heç nə alınmır)
 *   npm run purchase:zara -- --pay        → REAL ALIŞ (pul gedir!)
 *   npm run purchase:zara -- --user <id>  → yalnız bir user
 *
 * Default QƏSDƏN quru icradır: bayraqsız işə salmaq heç vaxt pul xərcləməməlidir.
 * Cron təsadüfən işə düşsə, ən pis halda plan çap olunur.
 */
import "dotenv/config";
import { runZaraPurchaseJob } from "../src/lib/purchase/run-zara";

const argv = process.argv.slice(2);
const pay = argv.includes("--pay");
const userIdx = argv.indexOf("--user");
const onlyUserId = userIdx > -1 ? argv[userIdx + 1] : undefined;

(async () => {
  if (pay) {
    console.log("⚠️  REAL ALIŞ REJİMİ — pul hərəkət edəcək.\n");
  } else {
    console.log("QURU İCRA — pul hərəkət etmir (real alış üçün: --pay)\n");
  }

  const r = await runZaraPurchaseJob({ pay, onlyUserId });

  console.log("=== PLAN (emal sırası ilə) ===");
  console.log(r.plan || "  (boş)");
  console.log();
  console.log("=== NƏTİCƏ ===");
  console.log(`  run id      : ${r.runId}`);
  console.log(`  rejim       : ${r.dryRun ? "quru icra" : "REAL ALIŞ"}`);
  console.log(`  user        : ${r.usersCompleted}/${r.usersPlanned}`);
  console.log(`  sətir       : ${r.itemsPlanned}`);
  if (r.blockers.length) {
    console.log(`  BLOKLAYICI  :`);
    for (const b of [...new Set(r.blockers)]) console.log(`    · ${b}`);
  }
  console.log(`  mesaj       : ${r.message}`);

  process.exit(r.ok ? 0 : 1);
})().catch((e) => {
  console.error("XƏTA:", e);
  process.exit(1);
});

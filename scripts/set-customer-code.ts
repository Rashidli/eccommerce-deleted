/**
 * Bir müştərinin kodunu ƏL İLƏ dəyişir.
 *
 *   npm run customer:code -- <cariKod|customerNo> <yeniKod>
 *   npm run customer:code -- FOR000003 EXP1761394
 *
 * Kod anbarın paketi tanıdığı yeganə nişandır, ona görə:
 *  · yeni kod BAŞQA müştəridə varsa dəyişiklik edilmir (unikallıq);
 *  · dəyişiklikdən əvvəl və sonra dəyər açıq çap olunur ki, operator görsün.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [target, next] = process.argv.slice(2);
  if (!target || !next) {
    console.error("İstifadə: npm run customer:code -- <cariKod|customerNo> <yeniKod>");
    process.exit(1);
  }

  const asNo = Number(target);
  const user = await prisma.user.findFirst({
    where: Number.isFinite(asNo) && String(asNo) === target
      ? { customerNo: asNo }
      : { customerCode: target },
    select: { id: true, customerNo: true, customerCode: true, fullName: true, email: true },
  });
  if (!user) {
    console.error(`Müştəri tapılmadı: ${target}`);
    process.exit(1);
  }

  const clash = await prisma.user.findFirst({
    where: { customerCode: next, NOT: { id: user.id } },
    select: { customerNo: true, fullName: true },
  });
  if (clash) {
    console.error(`"${next}" artıq #${clash.customerNo} (${clash.fullName}) müştərisindədir — dəyişiklik edilmədi.`);
    process.exit(1);
  }

  await prisma.user.update({ where: { id: user.id }, data: { customerCode: next } });
  console.log(`#${user.customerNo} ${user.fullName} <${user.email}>`);
  console.log(`  ${user.customerCode}  →  ${next}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

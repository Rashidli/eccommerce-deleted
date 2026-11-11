/**
 * MÖVCUD ADMIN HESABININ PAROLUNU SIFIRLAYIR.
 *
 *   npm run admin:password -- --email admin@admin.com
 *
 * Niyə ayrıca skript: `admin:create` mövcud e-poçtu rədd edir (qəsdən — hesabı
 * səhvən əzməsin), panel isə parol dəyişmək üçün ARTIQ girmiş olmağı tələb edir.
 * Yəni parol unudulanda çıxış yolu qalmırdı.
 *
 * Parol arqumentlə VERİLMİR: komanda sətri `ps`-də görünür və shell tarixçəsinə
 * düşür. Gizli soruşulur, yaxud `ADMIN_SEED_PASSWORD`-dan götürülür.
 *
 * Panelin `setAdminPassword` əməliyyatı ilə EYNİ davranır (admins/actions.ts):
 * parol dəyişir VƏ həmin hesabın bütün açıq sessiyaları bağlanır — köhnə
 * parolla açılmış brauzer sessiyası işləməyə davam etməsin.
 */
import "dotenv/config";
import { createInterface } from "node:readline";
import { prisma } from "../src/lib/prisma";
import { hashAdminPassword } from "../src/lib/admin-password";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

/** Parolu ekranda göstərmədən soruşur. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const stdout = process.stdout as NodeJS.WriteStream;
    const original = stdout.write.bind(stdout);
    let muted = false;

    stdout.write = ((chunk: string, ...rest: unknown[]) => {
      if (muted && typeof chunk === "string" && !chunk.includes("\n")) return true;
      return (original as (c: string, ...r: unknown[]) => boolean)(chunk, ...rest);
    }) as typeof stdout.write;

    rl.question(question, (answer) => {
      stdout.write = original;
      process.stdout.write("\n");
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const email = (arg("email") ?? "").trim().toLowerCase();
  if (!email) {
    console.error("İstifadə: npm run admin:password -- --email <e-poçt>");
    process.exit(1);
  }

  const admin = await prisma.admin.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true, role: true },
  });
  if (!admin) {
    console.error(`${email} tapılmadı. Mövcud hesablar üçün: admin:create`);
    process.exit(1);
  }

  const password =
    process.env.ADMIN_SEED_PASSWORD ?? (await askHidden("Yeni parol (görünmür): "));

  if (password.length < 8) {
    console.error("Parol ən azı 8 simvol olmalıdır.");
    process.exit(1);
  }

  // Panellə eyni: parol + sessiyaların bağlanması BİR tranzaksiyada.
  const [, revoked] = await prisma.$transaction([
    prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashAdminPassword(password) },
    }),
    prisma.adminSession.deleteMany({ where: { adminId: admin.id } }),
  ]);

  console.log(`✓ Parol dəyişdirildi: ${admin.fullName} <${admin.email}>`);
  console.log(`  bağlanan sessiya: ${revoked.count}`);
  console.log("  Giriş: /admin/login");
}

main()
  .catch((e) => {
    console.error("XƏTA:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

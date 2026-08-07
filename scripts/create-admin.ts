/**
 * İLK (və ya növbəti) ADMIN HESABINI YARADIR.
 *
 *   npm run admin:create -- --email ali@ecommerce.az --name "Ali Məmmədov" --role owner
 *
 * Parol arqumentlə VERİLMİR: komanda sətri `ps`-də görünür və shell
 * tarixçəsinə düşür. Skript onu gizli şəkildə soruşur, yoxsa `ADMIN_SEED_PASSWORD`
 * mühit dəyişənindən götürür.
 *
 * Niyə brauzerdən yox, buradan: giriş qapısı YALNIZ admin bazasına baxmalıdır.
 * "Hesab yoxdursa .env parolu ilə gir" kimi ehtiyat yol qapını iki mənbəyə
 * bağlayır — parol sızsa hesabları bağlamaq kifayət etmir.
 */
import "dotenv/config";
import { createInterface } from "node:readline";
import { prisma } from "../src/lib/prisma";
import { hashAdminPassword } from "../src/lib/admin-password";
import { permissionsForRole, ROLE_LABELS } from "../src/lib/admin-permissions";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

/** Parolu ekranda göstərmədən soruşur. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const stdout = process.stdout as NodeJS.WriteStream & { _write?: unknown };
    const original = stdout.write.bind(stdout);
    let muted = false;

    // Yazılan simvollar ekrana düşməsin.
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
  const fullName = (arg("name") ?? "").trim();
  const role = arg("role") ?? "owner";

  if (!email || !fullName) {
    console.error(
      'İstifadə: npm run admin:create -- --email <e-poçt> --name "<Ad Soyad>" [--role owner|admin|operator|editor]',
    );
    process.exit(1);
  }
  if (!ROLE_LABELS[role]) {
    console.error(`Bilinməyən rol: ${role}. Mümkün: ${Object.keys(ROLE_LABELS).join(", ")}`);
    process.exit(1);
  }

  const exists = await prisma.admin.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    console.error(`${email} artıq qeydiyyatdadır.`);
    process.exit(1);
  }

  const password =
    process.env.ADMIN_SEED_PASSWORD ?? (await askHidden("Parol (görünmür): "));

  if (password.length < 8) {
    console.error("Parol ən azı 8 simvol olmalıdır.");
    process.exit(1);
  }

  const admin = await prisma.admin.create({
    data: {
      email,
      fullName,
      password: hashAdminPassword(password),
      role,
      permissions: permissionsForRole(role),
    },
  });

  console.log(`✓ Admin yaradıldı: ${admin.fullName} <${admin.email}>`);
  console.log(`  rol: ${ROLE_LABELS[admin.role]} · icazə: ${admin.permissions.length} bölmə`);
  console.log("  Giriş: /admin/login");
}

main()
  .catch((e) => {
    console.error("XƏTA:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

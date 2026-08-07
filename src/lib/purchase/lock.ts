import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * ALIŞ JOB-UNUN KİLİDİ.
 *
 * Niyə lazımdır (bu, job-un ən vacib hissəsidir):
 * Zara checkout-u TƏK paylaşılan brauzer sessiyasıdır. Biz bir müştərinin
 * sifarişini verərkən ikinci icra billing formasındakı ADI dəyişsə, alış
 * BAŞQA müştərinin adına düşər. Bu, sonradan düzəldilə bilməyən səhvdir.
 *
 * Niyə `pg_advisory_lock` (yaddaşdakı bayraq deyil):
 *  · proses yenidən başlasa da kilid bazadadır, itmir;
 *  · cron təsadüfən iki dəfə işə düşsə, ikincisi bloklanır;
 *  · başqa terminaldan əl ilə işə salınsa da bloklanır;
 *  · sessiya bitəndə PostgreSQL kilidi AVTOMATİK buraxır — proses `kill -9`
 *    olsa belə kilid ilişib qalmır (fayl əsaslı kilidin əsas problemi budur).
 *
 * `pg_try_advisory_lock` işlədilir, `pg_advisory_lock` YOX: gözləyib növbəyə
 * durmaq istəmirik. Kilid tutulubsa, ikinci icra dərhal və təmiz çıxır.
 */

/** Kilid açarı — sabit ədəd; başqa advisory lock-larla toqquşmasın deyə seçilib. */
const LOCK_KEY = 771_688_2026;

export type LockHandle = {
  /** Kilidi buraxır. `finally` blokunda MÜTLƏQ çağırılmalıdır. */
  release: () => Promise<void>;
};

/**
 * Kilidi tutmağa çalışır.
 * @returns kilid alınıbsa `LockHandle`, tutulubsa `null`.
 */
export async function acquirePurchaseLock(): Promise<LockHandle | null> {
  // Advisory lock SESSİYAYA bağlıdır. Prisma-nın hovuzunda hər sorğu başqa
  // bağlantıya düşə bilər, ona görə kilid üçün AYRICA, uzunömürlü bağlantı
  // saxlayırıq — əks halda kilidi bir bağlantı tutar, buraxmağa çalışan
  // başqası olar və kilid sessiya bitənə qədər ilişib qalar.
  const client = await openDedicatedConnection();

  const rows = await client.$queryRawUnsafe<{ locked: boolean }[]>(
    `SELECT pg_try_advisory_lock(${LOCK_KEY}) AS locked`,
  );

  if (!rows[0]?.locked) {
    await client.$disconnect();
    return null;
  }

  return {
    release: async () => {
      try {
        await client.$queryRawUnsafe(`SELECT pg_advisory_unlock(${LOCK_KEY})`);
      } finally {
        // Bağlantını bağlamaq kilidi onsuz da buraxır — bu, ikiqat qorumadır.
        await client.$disconnect();
      }
    },
  };
}

/**
 * Kilid üçün ayrıca Prisma bağlantısı.
 * Prisma-nın `$queryRaw`-ı hovuzdan bağlantı götürür; advisory lock isə
 * sessiyaya bağlı olduğu üçün eyni bağlantıda qalmalıdır.
 */
async function openDedicatedConnection() {
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Tək bağlantı — advisory lock məhz onun üzərində qalır.
    max: 1,
  });
  const client = new PrismaClient({ adapter });
  await client.$connect();
  return client;
}

/** Kilidin hazırda tutulub-tutulmadığını yoxlayır (yalnız məlumat üçün). */
export async function isPurchaseLockHeld(): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ held: boolean }[]>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_locks
       WHERE locktype = 'advisory' AND objid = ${LOCK_KEY} AND granted
     ) AS held`,
  );
  return Boolean(rows[0]?.held);
}

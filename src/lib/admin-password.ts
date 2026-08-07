import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * ADMIN PAROLU — hash və yoxlama.
 *
 * `admin-auth.ts`-dən AYRICA fayldır, çünki o, `server-only` import edir və
 * React server konteksti xaricində (məsələn `npm run admin:create` skripti)
 * atır. Bu modul isə təmiz kriptoqrafiyadır — həm serverdə, həm CLI-da
 * işləyir.
 *
 * ⚠️ Müştəri parolundan (`user-session.ts`) qəsdən ayrıdır: alqoritm eynidir,
 * amma kod ortaq deyil (qayda #1).
 */

/** `salt:hash` formatında saxlanır — açıq parol heç vaxt yazılmır. */
export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

/** Sabit vaxtda müqayisə — timing sızması olmasın. */
export function verifyAdminPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

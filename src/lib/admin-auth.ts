import "server-only";
import { prisma } from "@/lib/prisma";
import { hashAdminPassword, verifyAdminPassword } from "@/lib/admin-password";

// Parol hesablaması AYRICA faylda saxlanılır (`admin-password.ts`): bu modul
// `server-only`-dir və CLI skriptlərindən import oluna bilmir, hash isə həm
// serverdə, həm `npm run admin:create`-də lazımdır.
export { hashAdminPassword, verifyAdminPassword };

/**
 * ADMIN HESAB QATI — MÜŞTƏRİ AUTH-DAN TAM AYRI (qayda #1).
 *
 * Bu fayl `@/lib/user-session`-dan QƏSDƏN ayrıdır və ondan heç nə import
 * etmir. Ortaq "auth helper" yaratmaq iki sistemin bir-birinə qarışmasına
 * aparan ilk addımdır — bir dəfə ortaqlaşdırsaq, sabah müştəri sessiyası
 * admin panelini açan səhv bir sətir kifayət edir.
 *
 * Parol hash-i scrypt-dir; alqoritm eynidir, amma kod ayrıdır.
 */

/** Sistemdə heç bir admin hesabı varmı? (İlk quraşdırma yoxlaması.) */
export async function hasAnyAdmin(): Promise<boolean> {
  return (await prisma.admin.count()) > 0;
}

export type AdminIdentity = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  /** Həqiqi icazə siyahısı — `owner` üçün yoxlama onsuz da keçilir. */
  permissions: string[];
};

/** E-poçt + parol yoxlayır. Deaktiv hesab girə bilmir. */
export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AdminIdentity | null> {
  const admin = await prisma.admin.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!admin || !admin.isActive) return null;
  if (!verifyAdminPassword(password, admin.password)) return null;

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role,
    permissions: admin.permissions,
  };
}

const SESSION_TTL_HOURS = 12;

/** Sessiya sətri yaradır — cookie-dəki token bu sətrə işarə edir. */
export async function createAdminSession(
  adminId: string,
  userAgent?: string | null,
): Promise<{ sessionId: string; maxAgeSeconds: number }> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const row = await prisma.adminSession.create({
    data: { adminId, expiresAt, userAgent: userAgent ?? null },
    select: { id: true },
  });
  return { sessionId: row.id, maxAgeSeconds: SESSION_TTL_HOURS * 60 * 60 };
}

/**
 * Sessiyanı yoxlayır: sətir varmı, vaxtı keçməyibmi, hesab hələ də aktivmi.
 *
 * Yalnız imzaya baxmaq KİFAYƏT DEYİL: imzalanmış token ləğv edilə bilmir və
 * hesab bağlandıqdan sonra da vaxtı bitənə qədər işləyərdi.
 */
export async function resolveAdminSession(
  sessionId: string,
): Promise<AdminIdentity | null> {
  const row = await prisma.adminSession.findUnique({
    where: { id: sessionId },
    include: { admin: true },
  });
  if (!row) return null;

  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }
  if (!row.admin.isActive) return null;

  return {
    id: row.admin.id,
    email: row.admin.email,
    fullName: row.admin.fullName,
    role: row.admin.role,
    permissions: row.admin.permissions,
  };
}

export async function destroyAdminSession(sessionId: string): Promise<void> {
  await prisma.adminSession.delete({ where: { id: sessionId } }).catch(() => {});
}

/** Vaxtı keçmiş sessiyaları təmizləyir — sətirlər sonsuz yığılmasın. */
export async function pruneAdminSessions(): Promise<number> {
  const { count } = await prisma.adminSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}

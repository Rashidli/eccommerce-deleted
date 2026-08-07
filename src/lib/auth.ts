import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, createToken, verifyToken } from "@/lib/session";
import { resolveAdminSession, type AdminIdentity } from "@/lib/admin-auth";
import { can, type PermissionKey } from "@/lib/admin-permissions";

/**
 * ADMIN SESSİYASI — İKİ QAT.
 *
 *   1. Cookie-də İMZALANMIŞ token (`@/lib/session`). Ucuzdur, bazaya
 *      dəymir — `proxy.ts` naviqasiyanı məhz bununla kəsir.
 *   2. Bazada SESSİYA SƏTRİ (`AdminSession`). Əsl səlahiyyət yoxlaması
 *      budur: hesab hələ də varmı, aktivdirmi, sessiya ləğv olunmayıbmı.
 *
 * Niyə ikisi birdən: təkcə imza ilə sessiyanı GERİ ALMAQ mümkün deyil —
 * imza vaxtı bitənə qədər etibarlıdır, hesabı bağlasan belə. Təkcə baza ilə
 * isə hər naviqasiyada sorğu gedər. Ona görə imza "keçid kartı", baza sətri
 * "həqiqi icazə"dir.
 *
 * ⚠️ Token-in `sub` sahəsi ARTIQ sessiya id-sidir. Köhnə tokenlərdə orada
 * "admin" sözü olurdu — onlar bazada tapılmayacaq və sadəcə etibarsız
 * sayılacaq, yəni köhnə cookie ilə gəzən adam yenidən giriş edəcək.
 */

/** Girişdən sonra çağırılır — cookie sessiya id-si ilə imzalanır. */
export async function startSession(sessionId: string, maxAgeSeconds: number) {
  const { token } = createToken(sessionId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Cari sessiyanın id-si — çıxışda sətri silmək üçün lazımdır. */
export async function getSessionId(): Promise<string | null> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value)?.sub ?? null;
}

/**
 * Cari admin — yoxdursa `null`.
 *
 * Bu funksiya BAZAYA dəyir, çünki "token etibarlıdır" ilə "bu adamın hələ
 * də icazəsi var" eyni şey deyil.
 */
export async function getAdmin(): Promise<AdminIdentity | null> {
  const sessionId = await getSessionId();
  if (!sessionId) return null;
  return resolveAdminSession(sessionId);
}

/**
 * Server action-lar üçün qoruma. `proxy.ts` səhifə keçidlərini kəsir,
 * amma action-lar proxy-dən keçmir — hər mutasiya bunu çağırmalıdır.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/**
 * Bölmə icazəsi tələb edir.
 *
 * `requireAdmin` yalnız "girişi var" deyir; hansı bölməyə çıxışı olduğu ayrı
 * sualdır. Menyu icazəsiz bölmələri gizlədir, amma bu KİFAYƏT DEYİL — ünvanı
 * əl ilə yazmaq mümkündür, ona görə səhifənin özü də yoxlayır.
 */
export async function requirePermission(
  permission: PermissionKey,
): Promise<AdminIdentity> {
  const admin = await requireAdmin();
  if (!can(admin, permission)) redirect("/admin?denied=" + permission);
  return admin;
}

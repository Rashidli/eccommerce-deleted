import "server-only";
import {
  randomBytes,
  scryptSync,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCustomerCode } from "@/lib/customer-code";

// Customer sessiyası — admin-dən (ecommerce_admin, HMAC) TAM ayrı (qayda #1).
export const USER_SESSION_COOKIE = "ecommerce_user";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

/* ----------------------------- Parol hash (scrypt) ----------------------------- */

/** `salt:hash` formatında saxlanır. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const dk = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${dk}`;
}

/** Sabit vaxtda müqayisə — timing sızması olmasın. */
export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/* ------------------------------- Session token -------------------------------- */

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Yeni sessiya yaradır: təsadüfi opaque token → cookie-yə raw, DB-yə yalnız hash.
 * DB kompromis olsa belə raw token bərpa oluna bilməz.
 */
export async function createUserSession(userId: string): Promise<void> {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = sha256(raw);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const store = await cookies();
  const ua = store.get("__ua")?.value ?? null; // proxy doldura bilər; yoxdursa null

  await prisma.userSession.create({
    data: { userId, tokenHash, expiresAt, userAgent: ua },
  });

  store.set(USER_SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  /** Müştəri nömrəsi — sayğac (1, 2, 3...). */
  customerNo: number;
  /**
   * Müştəri KODU — `FOR000001`. Bazada ayrıca sütundur (Postgres özü
   * hesablayır), ona görə burada HESABLANMIR, olduğu kimi oxunur.
   * Paneldə göstərilir və Zara sifarişində flat sahəsinə yazılır.
   */
  customerCode: string;
};

/** Cari istifadəçini cookie-dən oxuyur (yoxdursa/expired-dirsə null). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(USER_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: sha256(raw) },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) return null;

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    customerNo: user.customerNo,
    // Sütun `GENERATED ALWAYS`-dir, ona görə həmişə dolu olur; tip
    // nullable olduğu üçün sadəcə ehtiyat qiymət verilir.
    customerCode: user.customerCode ?? formatCustomerCode(user.customerNo),
  };
}

/** Sessiyanı bağlayır: DB sətrini silir və cookie-ni təmizləyir. */
export async function destroyUserSession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(USER_SESSION_COOKIE)?.value;
  if (raw) {
    await prisma.userSession
      .deleteMany({ where: { tokenHash: sha256(raw) } })
      .catch(() => {});
  }
  store.delete(USER_SESSION_COOKIE);
}

/** Server component/action-larda qorunma — girişsizsə /account-a yönləndirir. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

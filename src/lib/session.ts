import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ecommerce_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 saat

type Payload = { sub: string; exp: number };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET təyin olunmayıb");
  return value;
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createToken(sub = "admin"): { token: string; maxAge: number } {
  const payload: Payload = {
    sub,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  return { token: `${body}.${sign(body)}`, maxAge: MAX_AGE_SECONDS };
}

export function verifyToken(token: string | undefined): Payload | null {
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(body), "base64url");

  // Uzunluqlar fərqlidirsə timingSafeEqual atır — əvvəlcə yoxlanır.
  if (given.length !== expected.length) return null;
  if (!timingSafeEqual(given, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Payload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Parolu sabit vaxtda müqayisə edir — uzunluq sızmasın deyə hash-lənir. */
export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;

  const a = createHmac("sha256", secret()).update(input).digest();
  const b = createHmac("sha256", secret()).update(expected).digest();
  return timingSafeEqual(a, b);
}

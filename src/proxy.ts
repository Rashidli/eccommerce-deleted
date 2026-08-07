import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";

// Next 16: `middleware.ts` köhnəlib, adı `proxy.ts`-dir və Node.js runtime-da işləyir.
// Admin (ecommerce_admin, HMAC) və customer (ecommerce_user, DB session) TAM ayrı branch-lərdir (qayda #1).
const USER_COOKIE = "ecommerce_user"; // @/lib/user-session USER_SESSION_COOKIE ilə eyni olmalıdır

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // --- Admin sahəsi: HMAC token yoxlanışı ---
  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";
    const session = verifyToken(request.cookies.get(SESSION_COOKIE)?.value);

    // LOGIN SƏHİFƏSİ HƏMİŞƏ AÇIQDIR.
    //
    // Əvvəl burada "token varsa /admin-ə qaytar" qaydası vardı və o, SONSUZ
    // DÖNGƏ yaradırdı: proxy yalnız İMZAYA baxır, əsl yoxlama isə
    // `requireAdmin`-dədir (bazada sessiya sətri, hesabın aktivliyi).
    // İkisi fərqli qərar verəndə — məsələn köhnə formatda, imzası hələ
    // etibarlı cookie ilə — axın belə gedirdi:
    //   /admin → proxy buraxır → requireAdmin bazada tapmır → /admin/login
    //   /admin/login → proxy "girmisən" deyir → /admin → ...
    // Login səhifəsini həmişə buraxmaq bu döngəni kökündən kəsir; artıq
    // girmiş adamın login formasını görməsi isə zərərsizdir.
    if (isLogin) return NextResponse.next();

    if (!session) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- Panel (customer): yalnız cookie mövcudluğu (əsl DB yoxlaması layout-da requireUser) ---
  if (pathname.startsWith("/panel")) {
    const hasCookie = Boolean(request.cookies.get(USER_COOKIE)?.value);
    if (!hasCookie) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/panel/:path*"],
};

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { startSession } from "@/lib/auth";
import { authenticateAdmin, createAdminSession } from "@/lib/admin-auth";

export type LoginState = { error?: string };

/**
 * ADMIN GİRİŞİ — YALNIZ ADMIN BAZASINDAN.
 *
 * Əvvəl iki şey vardı və ikisi də səhv idi:
 *   · `.env`-dəki TƏK paylaşılan parol — kimin girdiyi bilinmirdi, bir
 *     nəfərin girişini ayrıca bağlamaq mümkün deyildi;
 *   · "hesab yoxdursa `.env` parolu ilə gir" ehtiyat yolu — giriş qapısını
 *     iki mənbəyə bağlayırdı, yəni parol sızsa hesabları bağlamaq kifayət
 *     etmirdi.
 *
 * İndi yeganə mənbə `Admin` cədvəlidir. İlk hesab serverdə komanda ilə
 * yaradılır: `npm run admin:create` — parol brauzerdən, HTML-dən və
 * loglardan keçmir.
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email) return { error: "E-poçtu daxil edin." };
  if (!password) return { error: "Parolu daxil edin." };

  const admin = await authenticateAdmin(email, password);
  // Səbəb AÇILMIR: "belə hesab yoxdur" ilə "parol səhvdir" fərqi hansı
  // e-poçtların qeydiyyatda olduğunu üzə çıxarır.
  if (!admin) return { error: "E-poçt və ya parol yanlışdır." };

  const agent = (await headers()).get("user-agent");
  const { sessionId, maxAgeSeconds } = await createAdminSession(admin.id, agent);
  await startSession(sessionId, maxAgeSeconds);

  // Açıq yönləndirməyə qarşı: yalnız /admin altına buraxılır.
  redirect(next.startsWith("/admin") ? next : "/admin");
}

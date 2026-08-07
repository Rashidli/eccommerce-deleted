"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  createUserSession,
  destroyUserSession,
} from "@/lib/user-session";
import { safeNext } from "./safe-next";
import { parseFin } from "./fin";

// Xəta kodları — client tərəfdə t.pages.* ilə lokallaşdırılır (hardcoded string yox, qayda #5).
export type AuthState = {
  error?: string;
  /**
   * İstifadəçinin YAZDIQLARI — xəta olanda forma bunlarla yenidən doldurulur.
   *
   * Server action-dan sonra forma yenidən render olunur və idarəsiz (`uncontrolled`)
   * input-lar sıfırlanır: "Bu e-poçt artıq qeydiyyatdadır" xətasında istifadəçi
   * ad, telefon, FİN — hamısını yenidən yazmalı olurdu.
   *
   * PAROL QƏSDƏN YOXDUR: geri qaytarılsa RSC cavabına və səhifə mənbəyinə
   * düşərdi. Parolu yenidən yazmaq kiçik narahatlıqdır, onu şəbəkəyə geri
   * göndərmək isə təhlükəsizlik səhvidir.
   */
  values?: {
    fullName?: string;
    email?: string;
    phone?: string;
    fin?: string;
  };
};

function cleanEmail(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim().toLowerCase();
}

// Açıq yönləndirmə süzgəci ayrıca fayldadır (`./safe-next`), çünki bu fayl
// `"use server"`-dir və yalnız async server action ixrac edə bilər.

export async function register(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const fullName = String(formData.get("name") ?? "").trim();
  const email = cleanEmail(formData.get("email"));
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // Xəta halında forma bunlarla yenidən doldurulur (parol daxil DEYİL).
  const values = {
    fullName,
    email,
    phone: phone ?? "",
    fin: String(formData.get("fin") ?? "").trim(),
  };

  if (!fullName || !email || !password)
    return { error: "fillFields", values };
  if (password.length < 6) return { error: "passwordMismatch", values };
  if (password !== confirm) return { error: "passwordMismatch", values };

  // FİN qeydiyyatda MƏCBURİDİR və yoxlama SERVERDƏ olur — formadakı `required`
  // yalnız rahatlıq üçündür, mühafizə deyil (istifadəçi onu asanlıqla keçir).
  const fin = parseFin(formData.get("fin"), { required: true });
  if (fin.error) return { error: fin.error, values };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "emailTaken", values };

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        fullName,
        phone,
        fin: fin.value,
        password: hashPassword(password),
        role: "customer",
      },
    });
  } catch (e) {
    // FİN unikaldır. Yarış şəraitində (eyni anda iki qeydiyyat) yuxarıdakı
    // yoxlamadan keçib burada P2002 verə bilər — istifadəçiyə xam Prisma
    // xətası göstərmək əvəzinə aydın mesaj qaytarırıq.
    if (
      typeof e === "object" &&
      e !== null &&
      (e as { code?: string }).code === "P2002"
    ) {
      const target = String((e as { meta?: { target?: unknown } }).meta?.target ?? "");
      return {
        error: target.includes("fin") ? "finTaken" : "emailTaken",
        values,
      };
    }
    throw e;
  }

  await createUserSession(user.id);
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  // Login-də də e-poçt itməsin — yalnız parol yenidən yazılır.
  if (!email || !password)
    return { error: "fillFields", values: { email } };

  const user = await prisma.user.findUnique({ where: { email } });
  // Eyni cavab vaxtı — istifadəçi mövcudluğu sızmasın deyə həmişə verify çağırılır.
  const ok = verifyPassword(password, user?.password ?? null);
  if (!user || !ok)
    return { error: "invalidCredentials", values: { email } };

  await createUserSession(user.id);
  redirect(safeNext(String(formData.get("next") ?? "")));
}

/** Çıxış — DB sessiyasını silir, cookie-ni təmizləyir, ana səhifəyə yönləndirir. */
export async function logout(): Promise<void> {
  await destroyUserSession();
  redirect("/");
}
